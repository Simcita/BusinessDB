import cron from "node-cron";

import logger from "../utils/logger.js";

import {
    process_xm_emails
} from "../services/gmail.service.js";



/**
 * start_gmail_worker()
 * --------------------
 * Registers the Gmail IMAP polling cron job.
 * Runs every minute and processes unread XM
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
     * Execute immediately on startup so the
     * first poll does not wait a full minute.
     */

    process_xm_emails();

    cron.schedule(
        "* * * * *",
        async () => {
            await process_xm_emails();
        }
    );

};
