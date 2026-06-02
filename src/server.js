import dotenv from "dotenv";

dotenv.config();

import "./config/env.js";

import app from "./app.js";

import logger from "./utils/logger.js";

import { start_gmail_worker } from "./workers/gmail.worker.js";

import { start_fulfillment_worker } from "./workers/fulfillment.worker.js";



/**
 * PORT
 * ----
 * Application server port.
 */

const PORT = process.env.PORT || 5000;



/**
 * start_server()
 * --------------
 * Starts the Express HTTP server.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */

const start_server = async () => {

    try {

        app.listen(

            PORT,

            () => {

                logger.info(

                    `server running on port ${PORT}`,

                    `environment: ${process.env.NODE_ENV}`,

                );

            }

        );

    }

    catch (error) {

        logger.error(error.message);

    }

};



start_server();

/** 
  
 * Start Gmail parser worker. 

 */

start_gmail_worker();

/**
 * Start fulfillment queue worker.
 */

start_fulfillment_worker();
