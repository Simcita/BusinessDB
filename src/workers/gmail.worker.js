import cron from "node-cron";

import logger from "../utils/logger.js";

import {
    process_xm_emails
} from "../services/gmail.service.js";



const POLL_CRON_SCHEDULE =
    process.env.POLL_CRON_SCHEDULE || "*/15 * * * *";



/**
 * start_gmail_worker()
 * --------------------
 * Registers the Gmail IMAP polling cron job.
 * Runs every POLL_CRON_SCHEDULE (default: 15 minutes).
 * Set DISABLE_EMAIL_POLLING=true to skip this worker entirely.
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
     * Tracks consecutive poll failures. After each failure the
     * worker skips an increasing number of ticks before retrying
     * (1 skip → 2 skips → 4 skips, capped at 4).
     * Resets to 0 on any successful poll.
     */

    let consecutive_failures = 0;
    let skips_remaining = 0;

    const safe_poll = async () => {

        if (skips_remaining > 0) {

            skips_remaining--;

            return;

        }

        try {

            await process_xm_emails();

            consecutive_failures = 0;

        }

        catch (err) {

            consecutive_failures++;

            skips_remaining = Math.min(
                Math.pow(2, consecutive_failures - 1),
                4
            );

            logger.error(
                `Gmail worker error (backoff: skip ${skips_remaining} poll(s)): ${err.message}`
            );

        }

    };

    safe_poll();

    cron.schedule(POLL_CRON_SCHEDULE, safe_poll);

};
