import cron from "node-cron";

import logger from "../utils/logger.js";

import {
    process_xm_emails,
    get_gmail_worker_health,
    describe_imap_error
} from "../services/gmail.service.js";

import { send_custom_email } from "../services/email.service.js";

import { create_audit_log } from "../services/audit.service.js";



const POLL_CRON_SCHEDULE =
    process.env.GMAIL_POLL_CRON || process.env.POLL_CRON_SCHEDULE || "*/15 * * * *";

const ALERT_THRESHOLD = Number(process.env.GMAIL_ALERT_THRESHOLD) || 3;

const ALERT_RECIPIENTS = (process.env.GMAIL_ALERT_EMAIL || "")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);



const build_alert_email_html = (failure_count, error) => `
    <p>The Gmail (IMAP) worker has failed ${failure_count} consecutive polling
       attempts (schedule: ${POLL_CRON_SCHEDULE}).</p>
    <p><strong>Last error:</strong> ${describe_imap_error(error)}</p>
    <p>This usually means the IMAP credentials, mailbox status, or DNS for the
       mail domain changed. Check:</p>
    <ul>
        <li>Railway environment variables — IMAP_HOST / IMAP_PORT / IMAP_USER / IMAP_PASS</li>
        <li>Namecheap Private Email — account lock, suspension, quota, or password rotation</li>
        <li>Recent DNS changes on the mail domain</li>
    </ul>
    <p>No further alerts will be sent until the worker recovers.</p>
`;



/**
 * send_gmail_failure_alert()
 * ----------------------------
 * Sends the one-time admin alert for a sustained Gmail worker
 * outage. Never throws — a failure here must not affect the
 * polling tick itself.
 *
 * Parameters:
 * -----------
 * failure_count : number
 *
 * error : Error
 *
 * Returns:
 * --------
 * Promise<boolean> — true only if the email actually sent.
 */

const send_gmail_failure_alert = async (failure_count, error) => {

    try {

        if (ALERT_RECIPIENTS.length === 0) {

            logger.warn("GMAIL_ALERT_EMAIL is not configured — skipping Gmail worker failure alert.");

            return false;

        }

        const result = await send_custom_email(
            ALERT_RECIPIENTS,
            `[Alert] Gmail worker has failed ${failure_count} polls in a row`,
            build_alert_email_html(failure_count, error)
        );

        if (!result.success) {

            logger.error(`Failed to send Gmail worker failure alert: ${result.response}`);

            return false;

        }

        logger.info(`Gmail worker failure alert sent to ${ALERT_RECIPIENTS.join(", ")}.`);

        await create_audit_log(
            "GMAIL_WORKER_ALERT_SENT",
            `Alert sent after ${failure_count} consecutive Gmail worker failures. Last error: ${describe_imap_error(error)}`
        ).catch((audit_error) => logger.error(`Failed to write audit log: ${audit_error.message}`));

        return true;

    }

    catch (unexpected_error) {

        logger.error(`Unexpected error sending Gmail worker failure alert: ${unexpected_error.message}`);

        return false;

    }

};



/**
 * start_gmail_worker()
 * --------------------
 * Registers the Gmail IMAP polling cron job.
 * Runs every POLL_CRON_SCHEDULE (default: 15 minutes), plus
 * once immediately on startup so the first poll does not wait
 * a full cron interval.
 * Set DISABLE_EMAIL_POLLING=true to skip this worker entirely.
 *
 * After GMAIL_ALERT_THRESHOLD consecutive failed polls, a single
 * alert email is sent to GMAIL_ALERT_EMAIL (if configured) and
 * recorded in the audit log. No further alerts fire until a
 * successful poll recovers the worker.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */

export const start_gmail_worker = () => {

    if (process.env.DISABLE_EMAIL_POLLING === "true") {

        logger.info("Gmail worker disabled via DISABLE_EMAIL_POLLING.");

        return;

    }

    logger.info(
        `Starting Gmail worker (schedule: ${POLL_CRON_SCHEDULE}).`
    );

    /**
     * Tracks whether an alert has already been sent for the
     * current outage, so repeated failures don't spam the
     * inbox. Reset to false on the next successful poll so a
     * future, distinct outage can alert again.
     */

    let skips_remaining = 0;
    let alert_sent = false;

    const safe_poll = async () => {

        if (skips_remaining > 0) {

            skips_remaining--;

            return;

        }

        try {

            await process_xm_emails();

            if (alert_sent) {

                logger.info("Gmail worker recovered — resuming normal polling.");

                await create_audit_log(
                    "GMAIL_WORKER_RECOVERED",
                    "Gmail worker completed a successful poll after a sustained outage."
                ).catch((audit_error) => logger.error(`Failed to write audit log: ${audit_error.message}`));

                alert_sent = false;

            }

            skips_remaining = 0;

        }

        catch (err) {

            const { consecutive_failures } = get_gmail_worker_health();

            skips_remaining = Math.min(
                Math.pow(2, consecutive_failures - 1),
                4
            );

            logger.error(
                `Gmail worker error (failure ${consecutive_failures}, backoff: skip ${skips_remaining} poll(s)): ${describe_imap_error(err)}`
            );

            if (consecutive_failures >= ALERT_THRESHOLD && !alert_sent) {

                alert_sent = await send_gmail_failure_alert(consecutive_failures, err);

            }

        }

    };

    /**
     * Execute immediately on startup so the first poll does not
     * wait a full cron interval.
     */

    safe_poll();

    cron.schedule(POLL_CRON_SCHEDULE, safe_poll);

};
