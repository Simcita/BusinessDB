import logger from "../utils/logger.js";



/**
 * global_error_handler()
 * ----------------------
 * Handles all uncaught application errors.
 *
 * Parameters:
 * -----------
 * error : Error Object
 *
 * request : Express Request Object
 *
 * response : Express Response Object
 *
 * next : Express Next Function
 *
 * Returns:
 * --------
 * JSON Error Response
 */

const global_error_handler = (

    error,
    request,
    response,
    next

) => {

    logger.error(error.message);



    return response.status(500).json({

        success: false,

        message: "Internal server error.",

        error: error.message

    });

};



export default global_error_handler;
