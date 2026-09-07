import { ImapFlow } from "imapflow";

import { simpleParser } from "mailparser";



import prisma from "../config/database.js";

import logger from "../utils/logger.js";

import {
    extract_xm_account_id
} from "../utils/xm.parser.js";



/**
 * Gmail worker health state (in-memory)
 * ---------------------------------------
 * Tracks consecutive IMAP poll failures and the last success/
 * failure timestamps. Read by gmail.worker.js to drive tick-
 * skipping backoff and failure alerting.
 *
 * Deliberately in-memory only, no DB persistence: this is a
 * single background worker on a single Railway service that
 * only restarts on deploy/crash (restartPolicyType: ON_FAILURE
 * in railway.json), not on a healthy running process.
 */

let consecutive_failures = 0;
let last_success_at = null;
let last_failure_at = null;
let last_error_summary = null;

export const get_gmail_worker_health = () => ({
    consecutive_failures,
    last_success_at,
    last_failure_at,
    last_error_summary
});



/**
 * describe_imap_error()
 * ----------------------
 * Builds a detailed, human-readable description of an error
 * raised by imapflow. imapflow throws a generic "Command failed"
 * Error for every IMAP NO/BAD response (wrong password, locked
 * account, quota, throttling, etc.) and attaches the real reason
 * to non-standard properties (responseText/responseStatus/
 * executedCommand/code) instead of the message. This surfaces
 * those properties so logs and alerts show the actual cause.
 *
 * Parameters:
 * -----------
 * error : Error
 *
 * Returns:
 * --------
 * string
 */

export const describe_imap_error = (error) => {

    const details = [];

    if (error.code) details.push(`code=${error.code}`);
    if (error.responseStatus) details.push(`status=${error.responseStatus}`);
    if (error.executedCommand) details.push(`command=${error.executedCommand}`);
    if (error.responseText) details.push(`serverSaid="${error.responseText}"`);

    return details.length > 0
        ? `${error.message} (${details.join(", ")})`
        : error.message;

};



/**
 * create_imap_client()
 * --------------------
 * Creates IMAPFlow client instance.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * ImapFlow Client
 */

const create_imap_client = () => {

    return new ImapFlow({

        host: process.env.IMAP_HOST,

        port: Number(process.env.IMAP_PORT),

        secure: true,

        auth: {

            user: process.env.IMAP_USER,

            pass: process.env.IMAP_PASS

        },

        logger: false

    });

};



/**
 * save_parser_log()
 * -----------------
 * Stores parser activity logs.
 *
 * Parameters:
 * -----------
 * log_data : object
 *
 * Returns:
 * --------
 * Promise<void>
 */

const save_parser_log = async (

    log_data

) => {

    await prisma.parserLog.create({

        data: log_data

    });

};



/**
 * save_xm_account()
 * -----------------
 * Stores XM account ID into database.
 *
 * Parameters:
 * -----------
 * account_id : string
 *
 * subject : string
 *
 * sender : string
 *
 * excerpt : string
 *
 * Returns:
 * --------
 * Promise<void>
 */

const save_xm_account = async (

    account_id,
    subject,
    sender,
    excerpt

) => {

    /**
     * Prevent duplicate account inserts.
     */

    const existing_account =

        await prisma.xmApprovedAccount.findUnique({

            where: {

                accountId: account_id

            }

        });



    /**
     * Skip duplicates.
     */

    if (existing_account) {

        logger.info(

            `Duplicate XM account skipped: ${account_id}`

        );

        return;

    }



    /**
     * Save new XM account.
     */

    await prisma.xmApprovedAccount.create({

        data: {

            accountId: account_id,

            emailSubject: subject,

            senderEmail: sender,

            rawEmailExcerpt: excerpt

        }

    });



    logger.info(

        `XM account saved: ${account_id}`

    );

};



/**
 * get_email_text()
 * ----------------
 * Returns the best plain-text representation of a parsed email.
 * Prefers the explicit text/plain part; falls back to stripping
 * HTML tags from the text/html part (XM emails are HTML-only).
 */

const get_email_text = (parsed_email) => {

    if (parsed_email.text) return parsed_email.text;

    const raw_html = parsed_email.html || "";

    return raw_html
        .replace(/(<([^>]+)>)/gi, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/\s+/g, " ")
        .trim();

};



/**
 * extract_and_save()
 * ------------------
 * Shared extraction + persistence logic used for both
 * direct emails and .eml attachments.
 */

const extract_and_save = async (email_text, email_subject, sender_email) => {

    const xm_account_id = extract_xm_account_id(email_text);

    if (!xm_account_id) {

        logger.warn(`Failed to extract XM account ID from: ${email_subject}`);

        await save_parser_log({
            emailSubject: email_subject,
            senderEmail: sender_email,
            parsingStatus: "FAILED",
            failureReason: "XM account ID not found"
        });

        return;

    }

    await save_xm_account(
        xm_account_id,
        email_subject,
        sender_email,
        email_text.slice(0, 500)
    );

    await save_parser_log({
        emailSubject: email_subject,
        senderEmail: sender_email,
        parsingStatus: "SUCCESS",
        extractedAccountId: xm_account_id
    });

    logger.info(`Processed XM account: ${xm_account_id}`);

};



/**
 * process_email_message()
 * -----------------------
 * Processes individual email message.
 * If the email contains .eml attachments, each attachment
 * is parsed and processed independently (bulk upload flow).
 * Otherwise the email body itself is parsed directly.
 *
 * Parameters:
 * -----------
 * message : object
 *
 * client : ImapFlow Client
 *
 * Returns:
 * --------
 * Promise<void>
 */

const process_email_message = async (

    message,
    client

) => {

    try {

        /**
         * Download raw email source via UID.
         * client.download() returns { content: ReadableStream, ... }.
         * simpleParser requires the stream, not the wrapper object.
         */

        const { content } = await client.download(

            message.uid,
            undefined,
            { uid: true }

        );



        /**
         * Parse email content from the readable stream.
         */

        const parsed_email = await simpleParser(content);



        /**
         * Check for .eml attachments (bulk upload flow).
         * Users can forward many XM registration emails as
         * .eml attachments in a single email to the inbox.
         */

        const eml_attachments = (parsed_email.attachments || []).filter(a =>
            a.filename?.toLowerCase().endsWith(".eml") ||
            a.contentType === "message/rfc822"
        );

        if (eml_attachments.length > 0) {

            logger.info(`Found ${eml_attachments.length} .eml attachment(s) — processing each.`);

            for (const attachment of eml_attachments) {

                const inner = await simpleParser(attachment.content);
                const text    = get_email_text(inner);
                const subject = inner.subject || parsed_email.subject || "";
                const sender  = inner.from?.text || "";

                await extract_and_save(text, subject, sender);

            }

        } else {

            const text    = get_email_text(parsed_email);
            const subject = parsed_email.subject || "";
            const sender  = parsed_email.from?.text || "";

            await extract_and_save(text, subject, sender);

        }

    }

    catch (error) {

        logger.error(`Failed to process email message: ${describe_imap_error(error)}`);

    }

};



/**
 * process_xm_emails()
 * -------------------
 * Connects to IMAP inbox and processes
 * unread XM emails.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * Promise<void>
 */

export const process_xm_emails = async () => {

    const client = create_imap_client();

    /**
     * Attach a no-op error listener before connecting.
     * ImapFlow emits 'error' events (e.g. ECONNRESET) on the
     * EventEmitter outside the Promise chain. Without a listener
     * Node.js treats these as unhandled and crashes the process.
     * The try/catch below still captures the rejection so the
     * error is logged through the normal path.
     */

    client.on("error", (err) => {

        logger.warn(

            `IMAP connection error (handled): ${describe_imap_error(err)}`

        );

    });



    try {

        /**
         * Connect to IMAP server.
         */

        await client.connect();



        logger.info(

            "Connected to IMAP server."

        );



        /**
         * Open inbox.
         */

        await client.mailboxOpen("INBOX");



        /**
         * Search for unseen (unread) emails that have not yet
         * been starred. The star flag is used as the processed
         * marker — any unseen email without a star is new and
         * needs to be handled. UIDs are stable across sessions
         * unlike sequence numbers.
         */

        const uids = await client.search(

            { seen: false, flagged: false },
            { uid: true }

        );



        logger.info(

            `Found ${uids.length} unseen unprocessed emails.`

        );



        /**
         * Process each unseen unstarred email.
         */

        for (const uid of uids) {

            await process_email_message(

                { uid },
                client

            );



            /**
             * Star the email after processing to mark it as
             * already added. Starring keeps the email unread
             * in the inbox while preventing re-processing on
             * future polling runs.
             */

            await client.messageFlagsAdd(

                uid,

                ["\\Flagged"],

                { uid: true }

            );

        }



        /**
         * Logout from IMAP.
         */

        await client.logout();



        logger.info(

            "IMAP session closed."

        );

        consecutive_failures = 0;

        last_success_at = new Date();

    }

    catch (error) {

        consecutive_failures += 1;

        last_failure_at = new Date();

        last_error_summary = describe_imap_error(error);

        logger.error(

            `Gmail worker error: ${last_error_summary}`

        );

        /**
         * Force-close the connection if still open after an
         * error. A half-open TLS socket would hold the port
         * and block the next polling cycle.
         */

        try { await client.logout(); } catch { /* already closed */ }

        /**
         * Rethrow so gmail.worker.js's backoff/alerting logic can
         * react. process_xm_emails() has exactly one caller
         * (safe_poll() in gmail.worker.js), which already has its
         * own try/catch — without this rethrow that catch never
         * fires and the backoff counter never increments.
         */

        throw error;

    }

};
