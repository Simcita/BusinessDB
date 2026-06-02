import cron from "node-cron";

import prisma from "../config/database.js";

import logger from "../utils/logger.js";

import {

    move_job_to_dead_letter_queue

} from "../services/retry.service.js";

import {

    send_whatsapp_message

} from "../services/whatsapp.service.js";



import {

    send_verification_email

} from "../services/email.service.js";



import {

    create_audit_log

} from "../services/audit.service.js";



/**
 * process_fulfillment_jobs()
 * --------------------------
 * Processes pending fulfillment jobs.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * Promise<void>
 */

const process_fulfillment_jobs = async () => {

    /**
     * Fetch pending jobs.
     */

    const pending_jobs =

        await prisma.fulfillmentJob.findMany({

            where: {

                jobStatus: "PENDING"

            },

            include: {

                submission: true

            },

            take: 10

        });



    logger.info(

        `Processing ${pending_jobs.length} fulfillment jobs.`

    );



    /**
     * Process each job.
     */

    for (const job of pending_jobs) {

        try {

            /**
             * Mark job as processing.
             */

            await prisma.fulfillmentJob.update({

                where: {

                    id: job.id

                },

                data: {

                    jobStatus: "PROCESSING"

                }

            });



            let delivery_result;



            /**
             * Process WhatsApp jobs.
             */

            if (

                job.notificationChannel === "WHATSAPP"

            ) {

                delivery_result =

                    await send_whatsapp_message(

                        job.submission.phone,

                        job.submission.name,

                        job.submission.xmAccountId

                    );

            }



            /**
             * Process Email jobs.
             */

            if (

                job.notificationChannel === "EMAIL"

            ) {

                delivery_result =

                    await send_verification_email(

                        job.submission.email,

                        job.submission.name,

                        job.submission.xmAccountId

                    );

            }



            /**
             * Save fulfillment log.
             */

            await prisma.fulfillmentLog.create({

                data: {

                    submissionId: job.submission.id,

                    fulfillmentType:

                        job.notificationChannel,

                    deliveryStatus:

                        delivery_result.success

                            ? "SUCCESS"

                            : "FAILED",

                    providerResponse:

                        JSON.stringify(

                            delivery_result.response

                        )

                }

            });



            /**
             * Mark job complete.
             */

            await prisma.fulfillmentJob.update({

                where: {

                    id: job.id

                },

                data: {

                    jobStatus:

                        delivery_result.success

                            ? "COMPLETED"

                            : "FAILED",

                    processedAt: new Date()

                }

            });



            /**
             * Create audit log.
             */

            await create_audit_log(

                "FULFILLMENT_PROCESSED",

                `Processed ${job.notificationChannel} job`,

                job.id

            );

        }

        catch (error) {

            logger.error(

                error.message

            );



            /**
             * Increment retry count.
             */

            const updated_job =

                await prisma.fulfillmentJob.update({

                    where: {

                        id: job.id

                    },

                    data: {

                        retryCount: {

                            increment: 1

                        },

                        lastError: error.message,

                        jobStatus: "FAILED"

                    }

                });



            /**
             * Move permanently failed jobs.
             */

            if (updated_job.retryCount >= 3) {

                await move_job_to_dead_letter_queue(

                    updated_job,

                    error.message

                );

            }

        }



    }

};



/**
 * start_fulfillment_worker()
 * --------------------------
 * Starts fulfillment queue worker.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */

export const start_fulfillment_worker = () => {

    logger.info(

        "Starting fulfillment worker."

    );



    /**
     * Process jobs every minute.
     */

    cron.schedule(

        "* * * * *",

        async () => {

            await process_fulfillment_jobs();

        }

    );

};
