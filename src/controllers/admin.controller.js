import { z } from "zod";

import {
    generate_system_metrics
} from "../services/metrics.service.js";

import {
    get_paginated_submissions,
    get_paginated_jobs,
    get_paginated_parser_logs,
    get_paginated_approved_accounts,
    get_paginated_audit_logs,
    retry_fulfillment_job,
    get_failed_jobs
} from "../services/admin.service.js";

import {
    submissions_filter_schema,
    jobs_filter_schema,
    pagination_schema
} from "../validators/admin.validators.js";



/**
 * get_dashboard_metrics()
 * -----------------------
 * Returns a fresh system metrics snapshot.
 *
 * Parameters:
 * -----------
 * request  : Express Request Object
 * response : Express Response Object
 *
 * Returns:
 * --------
 * JSON Response
 */

export const get_dashboard_metrics = async (

    _request,
    response

) => {

    try {

        const metrics = await generate_system_metrics();

        return response.status(200).json({

            success: true,

            data: { metrics }

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
 * get_submissions()
 * -----------------
 * Returns paginated, filterable user submissions.
 *
 * Parameters:
 * -----------
 * request  : Express Request Object
 * response : Express Response Object
 *
 * Returns:
 * --------
 * JSON Response
 */

export const get_submissions = async (

    request,
    response

) => {

    try {

        const validated_query =
            submissions_filter_schema.parse(request.query);

        const result = await get_paginated_submissions({

            page: validated_query.page,

            limit: validated_query.limit,

            status: validated_query.status,

            search: validated_query.search

        });

        return response.status(200).json({

            success: true,

            data: result.data,

            meta: result.meta

        });

    }

    catch (error) {

        if (error instanceof z.ZodError) {

            return response.status(400).json({

                success: false,

                message: "Invalid query parameters.",

                errors: error.errors

            });

        }

        return response.status(500).json({

            success: false,

            message: error.message

        });

    }

};



/**
 * get_jobs()
 * ----------
 * Returns paginated, filterable fulfillment jobs.
 *
 * Parameters:
 * -----------
 * request  : Express Request Object
 * response : Express Response Object
 *
 * Returns:
 * --------
 * JSON Response
 */

export const get_jobs = async (

    request,
    response

) => {

    try {

        const validated_query =
            jobs_filter_schema.parse(request.query);

        const result = await get_paginated_jobs({

            page: validated_query.page,

            limit: validated_query.limit,

            status: validated_query.status,

            channel: validated_query.channel

        });

        return response.status(200).json({

            success: true,

            data: result.data,

            meta: result.meta

        });

    }

    catch (error) {

        if (error instanceof z.ZodError) {

            return response.status(400).json({

                success: false,

                message: "Invalid query parameters.",

                errors: error.errors

            });

        }

        return response.status(500).json({

            success: false,

            message: error.message

        });

    }

};



/**
 * retry_job()
 * -----------
 * Resets a failed fulfillment job back to PENDING.
 *
 * Parameters:
 * -----------
 * request  : Express Request Object
 * response : Express Response Object
 *
 * Returns:
 * --------
 * JSON Response
 */

export const retry_job = async (

    request,
    response

) => {

    try {

        const { job_id } = request.params;

        const updated_job = await retry_fulfillment_job(

            job_id,

            request.admin.admin_id

        );

        return response.status(200).json({

            success: true,

            data: { job: updated_job }

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
 * get_parser_logs()
 * -----------------
 * Returns paginated Gmail parser activity logs.
 *
 * Parameters:
 * -----------
 * request  : Express Request Object
 * response : Express Response Object
 *
 * Returns:
 * --------
 * JSON Response
 */

export const get_parser_logs = async (

    request,
    response

) => {

    try {

        const validated_query =
            pagination_schema.parse(request.query);

        const result = await get_paginated_parser_logs({

            page: validated_query.page,

            limit: validated_query.limit

        });

        return response.status(200).json({

            success: true,

            data: result.data,

            meta: result.meta

        });

    }

    catch (error) {

        if (error instanceof z.ZodError) {

            return response.status(400).json({

                success: false,

                message: "Invalid query parameters.",

                errors: error.errors

            });

        }

        return response.status(500).json({

            success: false,

            message: error.message

        });

    }

};



/**
 * get_approved_accounts()
 * -----------------------
 * Returns paginated XM approved accounts
 * extracted from the affiliate email inbox.
 *
 * Parameters:
 * -----------
 * request  : Express Request Object
 * response : Express Response Object
 *
 * Returns:
 * --------
 * JSON Response
 */

export const get_approved_accounts = async (

    request,
    response

) => {

    try {

        const validated_query =
            pagination_schema.parse(request.query);

        const result = await get_paginated_approved_accounts({

            page: validated_query.page,

            limit: validated_query.limit

        });

        return response.status(200).json({

            success: true,

            data: result.data,

            meta: result.meta

        });

    }

    catch (error) {

        if (error instanceof z.ZodError) {

            return response.status(400).json({

                success: false,

                message: "Invalid query parameters.",

                errors: error.errors

            });

        }

        return response.status(500).json({

            success: false,

            message: error.message

        });

    }

};



/**
 * get_audit_logs()
 * ----------------
 * Returns paginated system audit logs.
 *
 * Parameters:
 * -----------
 * request  : Express Request Object
 * response : Express Response Object
 *
 * Returns:
 * --------
 * JSON Response
 */

export const get_audit_logs = async (

    request,
    response

) => {

    try {

        const validated_query =
            pagination_schema.parse(request.query);

        const { event_type } = request.query;

        const result = await get_paginated_audit_logs({

            page: validated_query.page,

            limit: validated_query.limit,

            event_type: event_type || null

        });

        return response.status(200).json({

            success: true,

            data: result.data,

            meta: result.meta

        });

    }

    catch (error) {

        if (error instanceof z.ZodError) {

            return response.status(400).json({

                success: false,

                message: "Invalid query parameters.",

                errors: error.errors

            });

        }

        return response.status(500).json({

            success: false,

            message: error.message

        });

    }

};



/**
 * get_dead_letter_jobs()
 * ----------------------
 * Returns paginated dead-letter queue entries —
 * jobs that permanently failed after all retries.
 *
 * Parameters:
 * -----------
 * request  : Express Request Object
 * response : Express Response Object
 *
 * Returns:
 * --------
 * JSON Response
 */

export const get_dead_letter_jobs = async (

    request,
    response

) => {

    try {

        const validated_query =
            pagination_schema.parse(request.query);

        const result = await get_failed_jobs({

            page: validated_query.page,

            limit: validated_query.limit

        });

        return response.status(200).json({

            success: true,

            data: result.data,

            meta: result.meta

        });

    }

    catch (error) {

        if (error instanceof z.ZodError) {

            return response.status(400).json({

                success: false,

                message: "Invalid query parameters.",

                errors: error.errors

            });

        }

        return response.status(500).json({

            success: false,

            message: error.message

        });

    }

};
