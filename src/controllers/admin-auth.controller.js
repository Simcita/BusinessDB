import {

    authenticate_admin_user

} from "../services/admin-auth.service.js";



import {

    generate_admin_token

} from "../utils/jwt.js";



/**
 * admin_login()
 * -------------
 * Handles admin authentication login.
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

export const admin_login = async (

    request,
    response

) => {

    try {

        const {

            email,
            password

        } = request.body;



        /**
         * Authenticate admin.
         */

        const admin_user =

            await authenticate_admin_user(

                email,
                password

            );



        /**
         * Reject invalid credentials.
         */

        if (!admin_user) {

            return response.status(401).json({

                success: false,

                message: "Invalid credentials."

            });

        }



        /**
         * Generate JWT token.
         */

        const token =

            generate_admin_token(

                admin_user

            );



        return response.status(200).json({

            success: true,

            token,

            admin: {

                id: admin_user.id,

                fullName: admin_user.fullName,

                email: admin_user.email,

                role: admin_user.role

            }

        });

    }

    catch (error) {

        return response.status(500).json({

            success: false,

            message: error.message

        });

    }

};
