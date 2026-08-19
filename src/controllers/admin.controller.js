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
    get_failed_jobs,
    get_metrics_history,
    get_submission_by_id,
    get_xm_approved_account_by_id,
    create_xm_approved_account,
    update_xm_approved_account
} from "../services/admin.service.js";

import {
    submissions_filter_schema,
    jobs_filter_schema,
    pagination_schema,
    accounts_filter_schema,
    parser_logs_filter_schema,
    audit_logs_filter_schema,
    create_xm_account_schema,
    update_xm_account_schema
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

            channel: validated_query.channel,

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
            parser_logs_filter_schema.parse(request.query);

        const result = await get_paginated_parser_logs({

            page: validated_query.page,

            limit: validated_query.limit,

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
            accounts_filter_schema.parse(request.query);

        const result = await get_paginated_approved_accounts({

            page: validated_query.page,

            limit: validated_query.limit,

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
            audit_logs_filter_schema.parse(request.query);

        const result = await get_paginated_audit_logs({

            page: validated_query.page,

            limit: validated_query.limit,

            event_type: validated_query.event_type || null,

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



export const get_metrics_history_handler = async (

    request,
    response

) => {

    try {

        const limit = parseInt(request.query.limit || "24", 10);

        const data = await get_metrics_history({ limit: Math.min(limit, 96) });

        return response.status(200).json({

            success: true,

            data

        });

    }

    catch (error) {

        return response.status(500).json({

            success: false,

            message: error.message

        });

    }

};



export const get_submission_detail = async (

    request,
    response

) => {

    try {

        const { submission_id } = request.params;

        const submission = await get_submission_by_id(submission_id);

        if (!submission) {

            return response.status(404).json({

                success: false,

                message: "Submission not found."

            });

        }

        return response.status(200).json({

            success: true,

            data: submission

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
 * add_xm_account()
 * -----------------
 * Manually creates an XM approved-account record.
 * For rare edge cases only — normal flow is entirely
 * automatic via the Gmail parser.
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

export const add_xm_account = async (

    request,
    response

) => {

    try {

        const validated_body =
            create_xm_account_schema.parse(request.body);

        const new_account = await create_xm_approved_account(

            validated_body,

            request.admin.admin_id

        );

        return response.status(201).json({

            success: true,

            data: new_account

        });

    }

    catch (error) {

        if (error instanceof z.ZodError) {

            return response.status(400).json({

                success: false,

                message: "Validation failed.",

                errors: error.errors

            });

        }

        return response.status(error.status || 500).json({

            success: false,

            message: error.message

        });

    }

};



/**
 * edit_xm_account()
 * -------------------
 * Partially updates an XM approved-account record —
 * e.g. fixing a typo in the account ID.
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

export const edit_xm_account = async (

    request,
    response

) => {

    try {

        const { account_id } = request.params;

        const validated_body =
            update_xm_account_schema.parse(request.body);

        const existing_account =
            await get_xm_approved_account_by_id(account_id);

        if (!existing_account) {

            return response.status(404).json({

                success: false,

                message: "XM account not found."

            });

        }

        const updated_account = await update_xm_approved_account(

            account_id,

            validated_body,

            request.admin.admin_id

        );

        return response.status(200).json({

            success: true,

            data: updated_account

        });

    }

    catch (error) {

        if (error instanceof z.ZodError) {

            return response.status(400).json({

                success: false,

                message: "Validation failed.",

                errors: error.errors

            });

        }

        return response.status(error.status || 500).json({

            success: false,

            message: error.message

        });

    }

};
