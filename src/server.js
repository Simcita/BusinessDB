import dotenv from "dotenv";

dotenv.config();

import "./config/env.js";

import app from "./app.js";

import logger from "./utils/logger.js";

import { start_gmail_worker } from "./workers/gmail.worker.js";

import { start_fulfillment_worker } from "./workers/fulfillment.worker.js";

import { start_metrics_worker } from "./workers/metrics.worker.js";

import { start_verification_worker } from "./workers/verification.worker.js";



/**
 * PORT
 * ----
 * Application server port.
 */

const PORT = process.env.PORT || 5000;



/**
 * start_server()
 * --------------
 * Starts the Express HTTP server, then registers
 * all background workers.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * Promise<void>
 */

const start_server = async () => {

    try {

        app.listen(

            PORT,

            () => {

                logger.info(

                    `Server running on port ${PORT} — NODE_ENV=${process.env.NODE_ENV}`

                );

            }

        );



        /**
         * Workers are started after the HTTP server
         * is listening so that process crashes during
         * startup are easier to diagnose.
         */

        start_gmail_worker();

        start_fulfillment_worker();

        start_metrics_worker();

        start_verification_worker();

    }

    catch (error) {

        logger.error(`Server failed to start: ${error.message}`);

        process.exit(1);

    }

};



start_server();
