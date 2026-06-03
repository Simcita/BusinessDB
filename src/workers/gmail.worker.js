import cron from "node-cron";

import logger from "../utils/logger.js";

import {
    process_xm_emails
} from "../services/gmail.service.js";



/**
 * start_gmail_worker()
 * --------------------
 * Registers the Gmail IMAP polling cron job.
 * Runs every 10 minutes and processes unread XM
 * affiliate emails, extracting account IDs.
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

    logger.info("Starting Gmail worker.");

    /**
     * safe_poll()
     * -----------
     * Wraps process_xm_emails() in a top-level try/catch so an
     * ECONNRESET or any other uncaught rejection from the IMAP
     * layer never propagates to the cron scheduler and crashes
     * the process.
     */

    const safe_poll = async () => {

        try {

            await process_xm_emails();

        }

        catch (err) {

            logger.error(

                `Gmail worker uncaught error: ${err.message}`

            );

        }

    };

    /**
     * Execute immediately on startup so the
     * first poll does not wait a full minute.
     */

    safe_poll();

    cron.schedule("*/10 * * * *", safe_poll);

};
