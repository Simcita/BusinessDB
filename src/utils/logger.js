import winston from "winston";



/**
 * logger
 * ------
 * Centralized Winston logger configuration
 * used for application logging.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * Winston Logger Instance
 */

const logger = winston.createLogger({

    level: "info",

    format: winston.format.combine(

        winston.format.timestamp(),

        winston.format.printf(

            ({ level, message, timestamp }) => {

                return `[${timestamp}] ${level.toUpperCase()}: ${message}`;

            }

        )

    ),

    transports: [

        new winston.transports.Console(),

        new winston.transports.File({
            filename: "application.log"
        })

    ]

});



export default logger;
