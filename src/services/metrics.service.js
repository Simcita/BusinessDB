import prisma from "../config/database.js";



/**
 * generate_system_metrics()
 * -------------------------
 * Generates current system metrics snapshot.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * Promise<object>
 */

export const generate_system_metrics = async () => {

    /**
     * Aggregate system statistics.
     */

    const [

        total_submissions,

        successful_verifications,

        failed_verifications,

        pending_jobs,

        completed_jobs,

        failed_jobs,

        parser_failures

    ] = await Promise.all([

        prisma.userSubmission.count(),

        prisma.userSubmission.count({

            where: {

                status: "VERIFIED"

            }

        }),

        prisma.userSubmission.count({

            where: {

                status: "FAILED"

            }

        }),

        prisma.fulfillmentJob.count({

            where: {

                jobStatus: "PENDING"

            }

        }),

        prisma.fulfillmentJob.count({

            where: {

                jobStatus: "COMPLETED"

            }

        }),

        prisma.fulfillmentJob.count({

            where: {

                jobStatus: "FAILED"

            }

        }),

        prisma.parserLog.count({

            where: {

                parsingStatus: "FAILED"

            }

        })

    ]);



    /**
     * Save metrics snapshot.
     */

    const metrics =

        await prisma.systemMetric.create({

            data: {

                totalSubmissions:

                    total_submissions,

                successfulVerifications:

                    successful_verifications,

                failedVerifications:

                    failed_verifications,

                pendingJobs:

                    pending_jobs,

                completedJobs:

                    completed_jobs,

                failedJobs:

                    failed_jobs,

                parserFailures:

                    parser_failures

            }

        });



    return metrics;

};
