import prisma from "../config/database.js";

import logger from "../utils/logger.js";

import { create_audit_log } from "./audit.service.js";

import { verify_xm_account } from "./verification.service.js";

import { send_batch_emails, send_custom_email } from "./email.service.js";

import { build_waitlist_not_found_message } from "../utils/affiliate.js";



/**
 * build_pagination_meta()
 * -----------------------
 * Constructs a reusable pagination metadata object.
 * Mirrors admin.service.js's helper of the same name.
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
    total_pages: Math.max(1, Math.ceil(total / limit))

});



/**
 * create_waitlist_entry()
 * -------------------------
 * Public livestream waitlist signup. Performs a synchronous
 * lookup of xmAccountId against XmApprovedAccount in the same
 * request/response cycle — no queue or worker involved.
 *
 * Parameters:
 * -----------
 * signup_data : object  — { name, surname, email, xmAccountId }
 *
 * Returns:
 * --------
 * Promise<object>  — created LivestreamWaitlistEntry
 *
 * Throws:
 * -------
 * Error with .status = 404  — xmAccountId not found in approved accounts
 * Error with .status = 409  — email already on the waitlist
 */

export const create_waitlist_entry = async (signup_data) => {

    const account_found = await verify_xm_account(signup_data.xmAccountId);

    if (!account_found) {

        const error = new Error(build_waitlist_not_found_message());
        error.status = 404;
        throw error;

    }

    const existing_entry = await prisma.livestreamWaitlistEntry.findUnique({

        where: { email: signup_data.email }

    });

    if (existing_entry) {

        const error = new Error("This email is already on the waitlist.");
        error.status = 409;
        throw error;

    }

    const entry = await prisma.livestreamWaitlistEntry.create({

        data: {

            name: signup_data.name,

            surname: signup_data.surname,

            email: signup_data.email,

            xmAccountId: signup_data.xmAccountId,

            status: "PENDING"

        }

    });

    logger.info(`Livestream waitlist entry created: ${entry.id}`);

    return entry;

};



/**
 * create_waitlist_entry_by_admin()
 * ------------------------------------
 * Admin-added waitlist entry — lets an admin add anyone
 * directly (e.g. themselves, or someone the public signup
 * flow can't reach) so they control exactly who a send can go
 * to. Unlike the public signup, this does NOT require the
 * xmAccountId to already exist in XmApprovedAccount — the
 * whole point is admin override. The email-uniqueness rule
 * still applies, since it's a real database constraint.
 *
 * Parameters:
 * -----------
 * entry_data : object  — { name, surname, email, xmAccountId }
 * admin_id   : string
 *
 * Returns:
 * --------
 * Promise<object>  — created LivestreamWaitlistEntry
 *
 * Throws:
 * -------
 * Error with .status = 409  — email already on the waitlist
 */

export const create_waitlist_entry_by_admin = async (entry_data, admin_id) => {

    const existing_entry = await prisma.livestreamWaitlistEntry.findUnique({

        where: { email: entry_data.email }

    });

    if (existing_entry) {

        const error = new Error("This email is already on the waitlist.");
        error.status = 409;
        throw error;

    }

    const entry = await prisma.livestreamWaitlistEntry.create({

        data: {

            name: entry_data.name,

            surname: entry_data.surname,

            email: entry_data.email,

            xmAccountId: entry_data.xmAccountId,

            status: "PENDING"

        }

    });

    await create_audit_log(

        "WAITLIST_ENTRY_ADDED",

        `Admin ${admin_id} manually added ${entry.email} to the livestream waitlist.`,

        entry.id

    );

    logger.info(`Livestream waitlist entry added by admin: ${entry.id}`);

    return entry;

};



/**
 * get_paginated_waitlist_entries()
 * -----------------------------------
 * Returns a paginated, optionally status-filtered list of
 * waitlist entries for the admin dashboard.
 *
 * Parameters:
 * -----------
 * page   : number
 * limit  : number
 * status : string  — optional PENDING | SENT | FAILED filter
 *
 * Returns:
 * --------
 * Promise<{ data: array, meta: object }>
 */

export const get_paginated_waitlist_entries = async ({

    page = 1,
    limit = 20,
    status = null

}) => {

    const where_clause = {};

    if (status) {

        where_clause.status = status;

    }

    const [entries, total] = await Promise.all([

        prisma.livestreamWaitlistEntry.findMany({

            where: where_clause,

            orderBy: { joinedAt: "desc" },

            skip: (page - 1) * limit,

            take: limit

        }),

        prisma.livestreamWaitlistEntry.count({ where: where_clause })

    ]);

    return {

        data: entries,

        meta: build_pagination_meta(total, page, limit)

    };

};



/**
 * render_body()
 * -------------
 * Plain {{name}} string replace — nothing fancier, matching
 * the "two form fields sent fresh each time" requirement.
 *
 * Parameters:
 * -----------
 * body : string
 * name : string
 *
 * Returns:
 * --------
 * string
 */

const render_body = (body, name) => body.replaceAll("{{name}}", name);



/**
 * sleep()
 * -------
 * Promise-based delay, used to pace batch calls under
 * Resend's rate limit and to back off before a retry.
 *
 * Parameters:
 * -----------
 * ms : number
 *
 * Returns:
 * --------
 * Promise<void>
 */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));



/**
 * MIN_MS_BETWEEN_CHUNKS
 * ----------------------
 * Resend's rate limit is 2 requests/second on every plan
 * (confirmed against Resend's own docs — the paid plan raises
 * volume, not the per-second limit). 550ms comfortably keeps
 * every chunk call under that, regardless of how fast Resend
 * itself responds.
 */

const MIN_MS_BETWEEN_CHUNKS = 550;

const RETRY_BACKOFFS_MS = [1000, 2000];



/**
 * send_chunk_with_retry()
 * --------------------------
 * Sends one batch chunk, retrying with backoff specifically
 * when Resend reports a rate-limit error (its own documented
 * guidance for 429s) — any other failure is not retried here,
 * it's just reported so the caller can mark those entries
 * FAILED.
 *
 * Parameters:
 * -----------
 * emails          : array  — see send_batch_emails()
 * idempotency_key : string — prevents a retried request from
 *                    double-sending if the original actually
 *                    went through
 *
 * Returns:
 * --------
 * Promise<{ success: boolean, errors?: array, response?: string }>
 */

const send_chunk_with_retry = async (emails, idempotency_key) => {

    let last_result = null;

    for (let attempt = 0; attempt <= RETRY_BACKOFFS_MS.length; attempt++) {

        last_result = await send_batch_emails(emails, idempotency_key);

        if (last_result.success) {

            return last_result;

        }

        if (last_result.error_name !== "rate_limit_exceeded") {

            return last_result;

        }

        if (attempt < RETRY_BACKOFFS_MS.length) {

            logger.warn(
                `Waitlist batch rate-limited, retrying in ${RETRY_BACKOFFS_MS[attempt]}ms.`
            );

            await sleep(RETRY_BACKOFFS_MS[attempt]);

        }

    }

    return last_result;

};



/**
 * send_links_to_waitlist()
 * ---------------------------
 * Bulk-sends the admin's exact subject/body to every PENDING
 * or FAILED waitlist entry via Resend's batch API, chunked
 * into groups of 100, sent sequentially and paced to stay
 * under Resend's 2 req/s rate limit, with backoff-retry on
 * rate-limit errors. Uses batchValidation:"permissive" so a
 * single malformed recipient doesn't fail the whole chunk —
 * each entry is marked SENT or FAILED individually based on
 * Resend's actual per-message result. The body is sent
 * verbatim (only {{name}} is substituted) — nothing is
 * appended to it, so what the admin types is exactly what
 * goes out.
 *
 * Parameters:
 * -----------
 * content  : object  — { subject, body }
 * admin_id : string
 *
 * Returns:
 * --------
 * Promise<{ sent: number, failed: number, failedEmails: string[] }>
 */

export const send_links_to_waitlist = async (content, admin_id) => {

    const targets = await prisma.livestreamWaitlistEntry.findMany({

        where: { status: { in: ["PENDING", "FAILED"] } }

    });

    let sent_count = 0;
    let failed_count = 0;
    const failed_emails = [];

    const CHUNK_SIZE = 100;
    const run_id = `${Date.now()}-${admin_id}`;
    const total_chunks = Math.ceil(targets.length / CHUNK_SIZE);

    for (let offset = 0, chunk_index = 0; offset < targets.length; offset += CHUNK_SIZE, chunk_index++) {

        const chunk = targets.slice(offset, offset + CHUNK_SIZE);

        const emails = chunk.map((entry) => ({

            from: process.env.EMAIL_FROM,

            to: [entry.email],

            subject: content.subject,

            html: render_body(content.body, entry.name)

        }));

        const idempotency_key = `batch-waitlist-links/${run_id}-chunk-${chunk_index}`;

        let sent_ids = [];
        let failed_in_chunk = [];

        const result = await send_chunk_with_retry(emails, idempotency_key);

        if (!result.success) {

            failed_in_chunk = chunk.map((entry) => ({
                id: entry.id,
                email: entry.email,
                reason: result.response
            }));

        } else {

            const failed_indices = new Set(
                (result.errors || []).map((e) => e.index)
            );

            chunk.forEach((entry, index) => {

                if (failed_indices.has(index)) {

                    failed_in_chunk.push({ id: entry.id, email: entry.email });

                } else {

                    sent_ids.push(entry.id);

                }

            });

        }

        // Pace chunk calls to stay under Resend's 2 req/s limit,
        // regardless of how fast each call itself responds.
        // Skipped after the last chunk — nothing left to wait for.

        if (chunk_index < total_chunks - 1) {

            await sleep(MIN_MS_BETWEEN_CHUNKS);

        }

        if (sent_ids.length > 0) {

            await prisma.livestreamWaitlistEntry.updateMany({

                where: { id: { in: sent_ids } },

                data: { status: "SENT", sentAt: new Date() }

            });

            sent_count += sent_ids.length;

        }

        if (failed_in_chunk.length > 0) {

            const failed_ids = failed_in_chunk.map((f) => f.id);

            await prisma.livestreamWaitlistEntry.updateMany({

                where: { id: { in: failed_ids } },

                data: { status: "FAILED" }

            });

            failed_count += failed_in_chunk.length;

            failed_emails.push(...failed_in_chunk.map((f) => f.email));

        }

    }

    await create_audit_log(

        "WAITLIST_LINKS_SENT",

        `Admin ${admin_id} sent waitlist links to ${targets.length} pending/failed entries (${sent_count} sent, ${failed_count} failed).`,

        null

    );

    logger.info(
        `Waitlist bulk send complete: ${sent_count} sent, ${failed_count} failed.`
    );

    return { sent: sent_count, failed: failed_count, failedEmails: failed_emails };

};



/**
 * send_link_to_one_entry()
 * ----------------------------
 * Sends the admin's exact subject/body to a single,
 * admin-chosen waitlist entry — regardless of its current
 * status (unlike the bulk send, this is an explicit one-off
 * action, e.g. re-sending to someone who says they never got
 * it). Not part of the PENDING/FAILED bulk query. The body is
 * sent verbatim (only {{name}} is substituted) — nothing is
 * appended to it.
 *
 * Parameters:
 * -----------
 * entry_id : string
 * content  : object  — { subject, body }
 * admin_id : string
 *
 * Returns:
 * --------
 * Promise<object>  — updated LivestreamWaitlistEntry
 *
 * Throws:
 * -------
 * Error with .status = 404  — entry not found
 * Error with .status = 502  — delivery failed
 */

export const send_link_to_one_entry = async (entry_id, content, admin_id) => {

    const entry = await prisma.livestreamWaitlistEntry.findUnique({

        where: { id: entry_id }

    });

    if (!entry) {

        const error = new Error("Waitlist entry not found.");
        error.status = 404;
        throw error;

    }

    const html = render_body(content.body, entry.name);

    const result = await send_custom_email(entry.email, content.subject, html);

    const updated_entry = await prisma.livestreamWaitlistEntry.update({

        where: { id: entry_id },

        data: result.success
            ? { status: "SENT", sentAt: new Date() }
            : { status: "FAILED" }

    });

    if (!result.success) {

        logger.error(`Single waitlist send failed for ${entry.email}: ${result.response}`);

        const error = new Error(`Delivery failed: ${result.response}`);
        error.status = 502;
        throw error;

    }

    await create_audit_log(

        "WAITLIST_LINK_SENT_SINGLE",

        `Admin ${admin_id} sent waitlist links to ${entry.email}.`,

        entry_id

    );

    logger.info(`Waitlist link sent to single entry: ${entry_id} (${entry.email})`);

    return updated_entry;

};
