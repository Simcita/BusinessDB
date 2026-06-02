/**
 * get_health_status()
 * -------------------
 * Returns API health status information.
 *
 * Parameters:
 * -----------
 * request : Express Request Object
 *
 * response : Express Response Object
 *
 * Returns:
 * --------
 * JSON Response
 */

export const get_health_status = async (

    request,
    response

) => {

    return response.status(200).json({

        success: true,

        message: "BusinessDB API is running.",

        timestamp: new Date().toISOString()

    });

};
