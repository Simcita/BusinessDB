import prisma from "../config/database.js";

import logger from "../utils/logger.js";

import {
    create_audit_log
} from "./audit.service.js";



/**
 * create_fulfillment_jobs()
 * -------------------------
 * Creates WhatsApp and Email
 * fulfillment jobs after successful
 * XM verification.
 *
 * Parameters:
 * -----------
 * submission_id : string
 *
 * Returns:
 * --------
 * Promise<void>
 */

export const create_fulfillment_jobs = async (

    submission_id

) => {

    /**
     * Notification channels.
     */

    const channels = [

        "WHATSAPP",

        "EMAIL"

    ];



    /**
     * Create fulfillment jobs.
     */

    for (const channel of channels) {

        await prisma.fulfillmentJob.create({

            data: {

                submissionId: submission_id,

                notificationChannel: channel,

                jobStatus: "PENDING"

            }

        });

    }



    logger.info(

        `Fulfillment jobs created for submission ${submission_id}`

    );



    await create_audit_log(

        "FULFILLMENT_JOB_CREATED",

        `Created fulfillment jobs for submission ${submission_id}`,

        submission_id

    );

};
