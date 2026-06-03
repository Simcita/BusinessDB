import prisma from "../config/database.js";

import { create_audit_log } from "./audit.service.js";



/**
 * build_pagination_meta()
 * -----------------------
 * Constructs a reusable pagination metadata object.
 *
 * Parameters:
 * -----------
 * total  : number
 * page   : number
 * limit  : number
 *
 * Returns:
 * --------
 * object
 */

const build_pagination_meta = (total, page, limit) => ({

    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit)

});



/**
 * get_paginated_submissions()
 * ---------------------------
 * Returns a paginated and optionally filtered
 * list of user submissions for the dashboard.
 *
 * Parameters:
 * -----------
 * page   : number  — 1-based page number
 * limit  : number  — records per page
 * status : string  — optional SubmissionStatus filter
 * search : string  — optional search against email / xmAccountId
 *
 * Returns:
 * --------
 * Promise<{ data: array, meta: object }>
 */

export const get_paginated_submissions = async ({

    page = 1,
    limit = 20,
    status = null,
    search = null

}) => {

    const where_clause = {};



    if (status) {

        where_clause.status = status;

    }



    if (search) {

        where_clause.OR = [

            {
                email: {
                    contains: search,
                    mode: "insensitive"
                }
            },

            {
                submittedAccountId: {
                    contains: search,
                    mode: "insensitive"
                }
            },

            {
                name: {
                    contains: search,
                    mode: "insensitive"
                }
            }

        ];

    }



    const [submissions, total] = await Promise.all([

        prisma.userSubmission.findMany({

            where: where_clause,

            orderBy: {
                submittedAt: "desc"
            },

            skip: (page - 1) * limit,

            take: limit,

            include: {
                campaign: {
                    select: {
                        campaignName: true,
                        brokerName: true
                    }
                }
            }

        }),

        prisma.userSubmission.count({
            where: where_clause
        })

    ]);



    return {

        data: submissions,

        meta: build_pagination_meta(total, page, limit)

    };

};



/**
 * get_paginated_jobs()
 * --------------------
 * Returns a paginated and optionally filtered
 * list of fulfillment jobs.
 *
 * Parameters:
 * -----------
 * page    : number  — 1-based page number
 * limit   : number  — records per page
 * status  : string  — optional JobStatus filter
 * channel : string  — optional NotificationChannel filter
 *
 * Returns:
 * --------
 * Promise<{ data: array, meta: object }>
 */

export const get_paginated_jobs = async ({

    page = 1,
    limit = 20,
    status = null,
    channel = null

}) => {

    const where_clause = {};



    if (status) {

        where_clause.jobStatus = status;

    }



    if (channel) {

        where_clause.notificationChannel = channel;

    }



    const [jobs, total] = await Promise.all([

        prisma.fulfillmentJob.findMany({

            where: where_clause,

            orderBy: {
                createdAt: "desc"
            },

            skip: (page - 1) * limit,

            take: limit,

            include: {
                submission: {
                    select: {
                        name: true,
                        email: true,
                        xmAccountId: true
                    }
                }
            }

        }),

        prisma.fulfillmentJob.count({
            where: where_clause
        })

    ]);



    return {

        data: jobs,

        meta: build_pagination_meta(total, page, limit)

    };

};



/**
 * get_paginated_parser_logs()
 * ---------------------------
 * Returns a paginated list of Gmail parser logs.
 *
 * Parameters:
 * -----------
 * page  : number
 * limit : number
 *
 * Returns:
 * --------
 * Promise<{ data: array, meta: object }>
 */

export const get_paginated_parser_logs = async ({

    page = 1,
    limit = 20

}) => {

    const [parser_logs, total] = await Promise.all([

        prisma.parserLog.findMany({

            orderBy: {
                createdAt: "desc"
            },

            skip: (page - 1) * limit,

            take: limit

        }),

        prisma.parserLog.count()

    ]);



    return {

        data: parser_logs,

        meta: build_pagination_meta(total, page, limit)

    };

};



/**
 * get_paginated_approved_accounts()
 * ----------------------------------
 * Returns a paginated list of XM approved accounts
 * extracted from affiliate emails.
 *
 * Parameters:
 * -----------
 * page  : number
 * limit : number
 *
 * Returns:
 * --------
 * Promise<{ data: array, meta: object }>
 */

export const get_paginated_approved_accounts = async ({

    page = 1,
    limit = 20

}) => {

    const [accounts, total] = await Promise.all([

        prisma.xmApprovedAccount.findMany({

            orderBy: {
                fetchedAt: "desc"
            },

            skip: (page - 1) * limit,

            take: limit,

            include: {
                submissions: {
                    select: {
                        status: true
                    }
                }
            }

        }),

        prisma.xmApprovedAccount.count()

    ]);



    return {

        data: accounts,

        meta: build_pagination_meta(total, page, limit)

    };

};



/**
 * get_paginated_audit_logs()
 * --------------------------
 * Returns a paginated and optionally typed
 * list of audit log entries.
 *
 * Parameters:
 * -----------
 * page       : number
 * limit      : number
 * event_type : string  — optional filter
 *
 * Returns:
 * --------
 * Promise<{ data: array, meta: object }>
 */

export const get_paginated_audit_logs = async ({

    page = 1,
    limit = 20,
    event_type = null

}) => {

    const where_clause = {};



    if (event_type) {

        where_clause.eventType = event_type;

    }



    const [audit_logs, total] = await Promise.all([

        prisma.auditLog.findMany({

            where: where_clause,

            orderBy: {
                createdAt: "desc"
            },

            skip: (page - 1) * limit,

            take: limit

        }),

        prisma.auditLog.count({
            where: where_clause
        })

    ]);



    return {

        data: audit_logs,

        meta: build_pagination_meta(total, page, limit)

    };

};



/**
 * retry_fulfillment_job()
 * -----------------------
 * Resets a failed fulfillment job back to PENDING
 * so the worker will attempt delivery again.
 * Creates an audit log entry.
 *
 * Parameters:
 * -----------
 * job_id   : string  — UUID of the fulfillment job
 * admin_id : string  — UUID of the admin initiating the retry
 *
 * Returns:
 * --------
 * Promise<object>  — the updated job record
 */

export const retry_fulfillment_job = async (

    job_id,
    admin_id

) => {

    const updated_job = await prisma.fulfillmentJob.update({

        where: {

            id: job_id

        },

        data: {

            jobStatus: "PENDING",

            retryCount: 0,

            lastError: null,

            processedAt: null

        }

    });



    await create_audit_log(

        "JOB_MANUALLY_RETRIED",

        `Admin ${admin_id} manually retried job ${job_id}.`,

        job_id

    );



    return updated_job;

};



/**
 * get_failed_jobs()
 * -----------------
 * Returns a paginated list of dead-letter queue entries.
 *
 * Parameters:
 * -----------
 * page  : number
 * limit : number
 *
 * Returns:
 * --------
 * Promise<{ data: array, meta: object }>
 */

export const get_failed_jobs = async ({

    page = 1,
    limit = 20

}) => {

    const [failed_jobs, total] = await Promise.all([

        prisma.failedJob.findMany({

            orderBy: {
                failedAt: "desc"
            },

            skip: (page - 1) * limit,

            take: limit

        }),

        prisma.failedJob.count()

    ]);



    return {

        data: failed_jobs,

        meta: build_pagination_meta(total, page, limit)

    };

};
