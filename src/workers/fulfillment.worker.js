import cron from "node-cron";

import prisma from "../config/database.js";

const POLL_CRON_SCHEDULE =
    process.env.POLL_CRON_SCHEDULE || "*/15 * * * *";

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
 * MAXIMUM_RETRY_COUNT
 * -------------------
 * Maximum number of delivery attempts
 * before a job is moved to the dead-letter queue.
 */

const MAXIMUM_RETRY_COUNT = 3;



/**
 * process_single_job()
 * --------------------
 * Processes one fulfillment job end-to-end.
 * Handles delivery, logging, status updates,
 * and retry escalation.
 *
 * Parameters:
 * -----------
 * job : object
 *      Fulfillment job with nested submission and campaign.
 *
 * Returns:
 * --------
 * Promise<void>
 */

const process_single_job = async (job) => {

    try {

        /**
         * Mark job as processing to prevent
         * duplicate pickup by concurrent workers.
         */

        await prisma.fulfillmentJob.update({

            where: {

                id: job.id

            },

            data: {

                jobStatus: "PROCESSING"

            }

        });



        /**
         * Resolve campaign whop link, falling back
         * to the environment default when no campaign
         * is assigned.
         */

        const whop_link =
            job.submission.campaign?.whopLink
            || process.env.WHOP_LINK;



        let delivery_result;



        /**
         * Process WhatsApp delivery jobs.
         */

        if (job.notificationChannel === "WHATSAPP") {

            delivery_result = await send_whatsapp_message(

                job.submission.phone,
                job.submission.name,
                job.submission.xmAccountId

            );

        }



        /**
         * Process Email delivery jobs.
         */

        if (job.notificationChannel === "EMAIL") {

            delivery_result = await send_verification_email(

                job.submission.email,
                job.submission.name,
                job.submission.xmAccountId

            );

        }



        /**
         * Treat a failed provider response as an error
         * so the retry path is triggered correctly.
         */

        if (!delivery_result || !delivery_result.success) {

            throw new Error(

                delivery_result?.response
                || "Delivery returned a non-success status."

            );

        }



        /**
         * Persist successful delivery log.
         */

        await prisma.fulfillmentLog.create({

            data: {

                submissionId: job.submission.id,

                fulfillmentType: job.notificationChannel,

                deliveryStatus: "SUCCESS",

                providerResponse:
                    JSON.stringify(delivery_result.response)

            }

        });



        /**
         * Mark job as completed.
         */

        await prisma.fulfillmentJob.update({

            where: {

                id: job.id

            },

            data: {

                jobStatus: "COMPLETED",

                processedAt: new Date()

            }

        });



        await create_audit_log(

            "FULFILLMENT_COMPLETED",

            `Delivered ${job.notificationChannel} for submission ${job.submission.id}`,

            job.id

        );

    }

    catch (error) {

        logger.error(

            `Fulfillment job ${job.id} failed: ${error.message}`

        );



        /**
         * Determine whether this failure exhausts
         * the allowed retry budget.
         */

        const new_retry_count = job.retryCount + 1;

        const is_final_failure =
            new_retry_count >= MAXIMUM_RETRY_COUNT;



        /**
         * Persist failure log.
         */

        await prisma.fulfillmentLog.create({

            data: {

                submissionId: job.submission.id,

                fulfillmentType: job.notificationChannel,

                deliveryStatus: "FAILED",

                providerResponse: error.message

            }

        });



        /**
         * Reset to PENDING for retryable failures so the
         * next cron tick picks the job up again.
         * Set to FAILED permanently when retries are exhausted.
         */

        const updated_job = await prisma.fulfillmentJob.update({

            where: {

                id: job.id

            },

            data: {

                retryCount: new_retry_count,

                lastError: error.message,

                jobStatus: is_final_failure ? "FAILED" : "PENDING"

            }

        });



        /**
         * Move exhausted jobs to dead-letter queue.
         */

        if (is_final_failure) {

            await move_job_to_dead_letter_queue(

                updated_job,
                error.message

            );

            await create_audit_log(

                "FULFILLMENT_DEAD_LETTER",

                `Job ${job.id} moved to dead-letter queue after ${MAXIMUM_RETRY_COUNT} attempts.`,

                job.id

            );

        }

    }

};



/**
 * process_fulfillment_jobs()
 * --------------------------
 * Fetches and processes a batch of pending
 * fulfillment jobs.
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
     * Fetch next batch of pending jobs, including
     * the submission and its campaign for whop link resolution.
     */

    const pending_jobs = await prisma.fulfillmentJob.findMany({

        where: {

            jobStatus: "PENDING"

        },

        include: {

            submission: {

                include: {

                    campaign: true

                }

            }

        },

        take: 10,

        orderBy: {

            createdAt: "asc"

        }

    });



    if (pending_jobs.length === 0) {

        return;

    }



    logger.info(

        `Processing ${pending_jobs.length} fulfillment jobs.`

    );



    for (const job of pending_jobs) {

        await process_single_job(job);

    }

};



/**
 * start_fulfillment_worker()
 * --------------------------
 * Registers the fulfillment cron job.
 * Runs every minute.
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

    if (process.env.DISABLE_JOB_PROCESSING === "true") {

        logger.info("Fulfillment worker disabled via DISABLE_JOB_PROCESSING.");

        return;

    }

    logger.info(
        `Starting fulfillment worker (schedule: ${POLL_CRON_SCHEDULE}).`
    );

    cron.schedule(
        POLL_CRON_SCHEDULE,
        async () => {
            await process_fulfillment_jobs();
        }
    );

};
