import jwt from "jsonwebtoken";



/**
 * verify_admin_authentication()
 * -----------------------------
 * Verifies JWT admin authentication token.
 *
 * Parameters:
 * -----------
 * request : Express Request Object
 *
 * response : Express Response Object
 *
 * next : Express Next Function
 *
 * Returns:
 * --------
 * void
 */

const verify_admin_authentication = (

    request,
    response,
    next

) => {

    try {

        /**
         * Extract bearer token.
         */

        const authorization_header =

            request.headers.authorization;



        if (!authorization_header) {

            return response.status(401).json({

                success: false,

                message: "Authentication required."

            });

        }



        /**
         * Extract JWT token.
         */

        const token =

            authorization_header.split(" ")[1];



        /**
         * Verify token.
         */

        const decoded_token = jwt.verify(

            token,

            process.env.JWT_SECRET

        );



        request.admin = decoded_token;



        next();

    }

    catch (error) {

        return response.status(401).json({

            success: false,

            message: "Invalid authentication token."

        });

    }

};



export default verify_admin_authentication;
