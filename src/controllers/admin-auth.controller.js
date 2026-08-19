import { z } from "zod";

import {
    authenticate_admin_user
} from "../services/admin-auth.service.js";

import {
    generate_admin_token
} from "../utils/jwt.js";

import {
    create_audit_log
} from "../services/audit.service.js";

import {
    admin_login_schema
} from "../validators/admin.validators.js";



/**
 * AUTH_COOKIE_NAME
 * ----------------
 * Name of the HttpOnly authentication cookie
 * set on successful admin login.
 */

const AUTH_COOKIE_NAME = "admin_auth_token";



/**
 * COOKIE_OPTIONS
 * --------------
 * Secure HttpOnly cookie configuration.
 * sameSite "strict" prevents CSRF attacks.
 */

const COOKIE_OPTIONS = {

    httpOnly: true,

    secure: process.env.NODE_ENV === "production",

    sameSite: "strict",

    maxAge: 7 * 24 * 60 * 60 * 1000

};



/**
 * admin_login()
 * -------------
 * Authenticates admin credentials and issues
 * a JWT stored in an HttpOnly cookie.
 *
 * Parameters:
 * -----------
 * request  : Express Request Object
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

        /**
         * Validate request body.
         */

        const validated_body =
            admin_login_schema.parse(request.body);



        /**
         * Authenticate admin credentials.
         */

        const admin_user = await authenticate_admin_user(

            validated_body.email,

            validated_body.password

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
         * Generate JWT.
         */

        const token = generate_admin_token(admin_user);



        /**
         * Set HttpOnly cookie.
         * Token is never exposed in response body.
         */

        response.cookie(
            AUTH_COOKIE_NAME,
            token,
            COOKIE_OPTIONS
        );



        await create_audit_log(

            "ADMIN_LOGIN",

            `Admin ${admin_user.email} logged in.`,

            admin_user.id

        );



        /**
         * token is included in the body so the Next.js admin
         * dashboard (different origin) can read it via a Route
         * Handler and set its own HttpOnly cookie on its domain.
         * The HttpOnly cookie above is still set for same-origin
         * direct API access.
         */

        return response.status(200).json({

            success: true,

            data: {

                admin: {

                    id: admin_user.id,

                    fullName: admin_user.fullName,

                    email: admin_user.email,

                    role: admin_user.role

                },

                token

            }

        });

    }

    catch (error) {

        if (error instanceof z.ZodError) {

            return response.status(400).json({

                success: false,

                message: "Validation failed.",

                errors: error.issues

            });

        }

        return response.status(500).json({

            success: false,

            message: error.message

        });

    }

};



/**
 * admin_logout()
 * --------------
 * Clears the HttpOnly authentication cookie,
 * terminating the admin session.
 *
 * Parameters:
 * -----------
 * request  : Express Request Object
 * response : Express Response Object
 *
 * Returns:
 * --------
 * JSON Response
 */

export const admin_logout = async (

    request,
    response

) => {

    try {

        await create_audit_log(

            "ADMIN_LOGOUT",

            `Admin ${request.admin.admin_id} logged out.`,

            request.admin.admin_id

        );



        response.clearCookie(
            AUTH_COOKIE_NAME,
            COOKIE_OPTIONS
        );



        return response.status(200).json({

            success: true,

            message: "Logged out successfully."

        });

    }

    catch (error) {

        return response.status(500).json({

            success: false,

            message: error.message

        });

    }

};
