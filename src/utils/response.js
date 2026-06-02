/**
 * success_response()
 * ------------------
 * Standardized success response formatter.
 *
 * Parameters:
 * -----------
 * response : Express Response Object
 *
 * message : string
 *
 * data : object
 *
 * status_code : number
 *
 * Returns:
 * --------
 * JSON Response
 */

export const success_response = (

    response,
    message,
    data = {},

    status_code = 200

) => {

    return response.status(status_code).json({

        success: true,

        message,

        data

    });

};



/**
 * error_response()
 * ----------------
 * Standardized error response formatter.
 *
 * Parameters:
 * -----------
 * response : Express Response Object
 *
 * message : string
 *
 * status_code : number
 *
 * Returns:
 * --------
 * JSON Response
 */

export const error_response = (

    response,
    message,

    status_code = 500

) => {

    return response.status(status_code).json({

        success: false,

        message

    });

};
