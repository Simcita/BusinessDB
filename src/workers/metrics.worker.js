import cron from "node-cron";

import logger from "../utils/logger.js";

import {
    generate_system_metrics
} from "../services/metrics.service.js";



/**
 * METRICS_CRON_SCHEDULE
 * ----------------------
 * Runs every 15 minutes to capture a historical
 * metrics snapshot without overloading the database.
 */

const METRICS_CRON_SCHEDULE = "*/15 * * * *";



/**
 * capture_metrics_snapshot()
 * --------------------------
 * Generates and persists a system metrics snapshot.
 * Errors are logged but do not crash the worker.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * Promise<void>
 */

const capture_metrics_snapshot = async () => {

    try {

        const metrics = await generate_system_metrics();

        logger.info(

            `Metrics snapshot captured: ${metrics.id} | ` +
            `submissions=${metrics.totalSubmissions} ` +
            `pending_jobs=${metrics.pendingJobs}`

        );

    }

    catch (error) {

        logger.error(

            `Metrics worker error: ${error.message}`

        );

    }

};



/**
 * start_metrics_worker()
 * ----------------------
 * Registers the metrics snapshot cron job.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */

export const start_metrics_worker = () => {

    logger.info("Starting metrics worker.");

    cron.schedule(
        METRICS_CRON_SCHEDULE,
        async () => {
            await capture_metrics_snapshot();
        }
    );

};
