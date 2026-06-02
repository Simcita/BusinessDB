import prisma from "../config/database.js";

import {

    generate_system_metrics

} from "../services/metrics.service.js";



/**
 * get_dashboard_metrics()
 * -----------------------
 * Returns current system dashboard metrics.
 *
 * Parameters:
 * -----------
 * request : Express Request Object
 *
 * response : Express Response Object
 *
 * Returns:
 * --------
 * JSON Response
 */

export const get_dashboard_metrics = async (

    request,
    response

) => {

    try {

        const metrics =

            await generate_system_metrics();



        return response.status(200).json({

            success: true,

            metrics

        });

    }

    catch (error) {

        return response.status(500).json({

            success: false,

            message: error.message

        });

    }

};



/**
 * get_recent_submissions()
 * ------------------------
 * Returns recent user submissions.
 *
 * Parameters:
 * -----------
 * request : Express Request Object
 *
 * response : Express Response Object
 *
 * Returns:
 * --------
 * JSON Response
 */

export const get_recent_submissions = async (

    request,
    response

) => {

    try {

        const submissions =

            await prisma.userSubmission.findMany({

                orderBy: {

                    submittedAt: "desc"

                },

                take: 20

            });



        return response.status(200).json({

            success: true,

            submissions

        });

    }

    catch (error) {

        return response.status(500).json({

            success: false,

            message: error.message

        });

    }

};

/**
 * retry_failed_job()
 * ------------------
 * Retries failed fulfillment job.
 *
 * Parameters:
 * -----------
 * request : Express Request Object
 *
 * response : Express Response Object
 *
 * Returns:
 * --------
 * JSON Response
 */

export const retry_failed_job = async (

    request,
    response

) => {

    try {

        const {

            job_id

        } = request.params;



        /**
         * Reset failed job.
         */

        const updated_job =

            await prisma.fulfillmentJob.update({

                where: {

                    id: job_id

                },

                data: {

                    jobStatus: "PENDING",

                    retryCount: 0,

                    lastError: null

                }

            });



        return response.status(200).json({

            success: true,

            updated_job

        });

    }

    catch (error) {

        return response.status(500).json({

            success: false,

            message: error.message

        });

    }

};

