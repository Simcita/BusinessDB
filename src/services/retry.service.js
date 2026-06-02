import prisma from "../config/database.js";



/**
 * move_job_to_dead_letter_queue()
 * -------------------------------
 * Moves permanently failed jobs
 * into failed_jobs table.
 *
 * Parameters:
 * -----------
 * job : object
 *
 * failure_reason : string
 *
 * Returns:
 * --------
 * Promise<void>
 */

export const move_job_to_dead_letter_queue = async (

    job,
    failure_reason

) => {

    await prisma.failedJob.create({

        data: {

            originalJobId: job.id,

            notificationChannel:

                job.notificationChannel,

            failureReason: failure_reason,

            payloadSnapshot: job,

            retryAttempts: job.retryCount

        }

    });

};
