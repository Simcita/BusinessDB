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
    channel = null,
    search = null

}) => {

    const where_clause = {};



    if (status) {

        where_clause.jobStatus = status;

    }



    if (channel) {

        where_clause.notificationChannel = channel;

    }



    if (search) {

        where_clause.submission = {
            OR: [
                { email: { contains: search, mode: "insensitive" } },
                { xmAccountId: { contains: search, mode: "insensitive" } },
                { name: { contains: search, mode: "insensitive" } }
            ]
        };

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
    limit = 20,
    search = null

}) => {

    const where_clause = {};



    if (search) {

        where_clause.OR = [
            { emailSubject: { contains: search, mode: "insensitive" } },
            { senderEmail: { contains: search, mode: "insensitive" } },
            { extractedAccountId: { contains: search, mode: "insensitive" } }
        ];

    }



    const [parser_logs, total] = await Promise.all([

        prisma.parserLog.findMany({

            where: where_clause,

            orderBy: {
                createdAt: "desc"
            },

            skip: (page - 1) * limit,

            take: limit

        }),

        prisma.parserLog.count({ where: where_clause })

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
    limit = 20,
    search = null

}) => {

    const where_clause = {};



    if (search) {

        where_clause.OR = [
            { accountId: { contains: search, mode: "insensitive" } },
            { senderEmail: { contains: search, mode: "insensitive" } },
            { emailSubject: { contains: search, mode: "insensitive" } }
        ];

    }



    const [accounts, total] = await Promise.all([

        prisma.xmApprovedAccount.findMany({

            where: where_clause,

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

        prisma.xmApprovedAccount.count({ where: where_clause })

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
    event_type = null,
    search = null

}) => {

    const where_clause = {};



    if (event_type) {

        where_clause.eventType = event_type;

    }



    if (search) {

        where_clause.OR = [
            { eventDescription: { contains: search, mode: "insensitive" } },
            { performedBy: { contains: search, mode: "insensitive" } },
            { entityId: { contains: search, mode: "insensitive" } }
        ];

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



export const get_metrics_history = async ({ limit = 24 }) => {

    const metrics = await prisma.systemMetric.findMany({

        orderBy: { createdAt: "desc" },

        take: limit

    });

    return metrics.reverse();

};



export const get_submission_by_id = async (submission_id) => {

    const submission = await prisma.userSubmission.findUnique({

        where: { id: submission_id },

        include: {

            xmApprovedAccount: true,

            campaign: true,

            fulfillmentJobs: {
                orderBy: { createdAt: "desc" }
            },

            fulfillmentLogs: {
                orderBy: { createdAt: "desc" }
            }

        }

    });

    return submission;

};



/**
 * get_xm_approved_account_by_id()
 * --------------------------------
 * Returns a single XM approved account by its UUID.
 *
 * Parameters:
 * -----------
 * account_id : string
 *
 * Returns:
 * --------
 * Promise<object | null>
 */

export const get_xm_approved_account_by_id = async (account_id) => {

    return prisma.xmApprovedAccount.findUnique({

        where: { id: account_id }

    });

};



/**
 * create_xm_approved_account()
 * ------------------------------
 * Manually creates an XM approved-account record, for rare
 * edge cases where the Gmail parser missed an email. Not part
 * of the normal signup flow.
 *
 * Parameters:
 * -----------
 * account_data : object  — accountId, emailSubject?, senderEmail?,
 *                           rawEmailExcerpt?, parsedSuccessfully?
 * admin_id     : string
 *
 * Returns:
 * --------
 * Promise<object>  — created XmApprovedAccount record
 */

export const create_xm_approved_account = async (account_data, admin_id) => {

    const existing_account = await prisma.xmApprovedAccount.findUnique({

        where: { accountId: account_data.accountId }

    });

    if (existing_account) {

        const error = new Error(`XM account "${account_data.accountId}" already exists.`);
        error.status = 409;
        throw error;

    }

    const new_account = await prisma.xmApprovedAccount.create({

        data: {

            accountId: account_data.accountId,

            emailSubject: account_data.emailSubject,

            senderEmail: account_data.senderEmail,

            rawEmailExcerpt: account_data.rawEmailExcerpt,

            parsedSuccessfully: account_data.parsedSuccessfully ?? true

        }

    });

    await create_audit_log(

        "ACCOUNT_CREATED",

        `Admin ${admin_id} manually added XM account "${new_account.accountId}".`,

        new_account.id

    );

    return new_account;

};



/**
 * update_xm_approved_account()
 * -------------------------------
 * Partially updates an XM approved-account record — e.g.
 * fixing a typo in the account ID or captured metadata.
 *
 * Parameters:
 * -----------
 * account_id  : string
 * update_data : object  — partial XmApprovedAccount fields
 * admin_id    : string
 *
 * Returns:
 * --------
 * Promise<object>  — updated XmApprovedAccount record
 */

export const update_xm_approved_account = async (account_id, update_data, admin_id) => {

    const updated_account = await prisma.xmApprovedAccount.update({

        where: { id: account_id },

        data: update_data

    });

    await create_audit_log(

        "ACCOUNT_UPDATED",

        `Admin ${admin_id} updated XM account "${updated_account.accountId}".`,

        account_id

    );

    return updated_account;

};
