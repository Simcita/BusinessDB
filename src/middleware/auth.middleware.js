import jwt from "jsonwebtoken";



/**
 * AUTH_COOKIE_NAME
 * ----------------
 * Name of the HttpOnly cookie set by the login endpoint.
 * Must match the value used in admin-auth.controller.js.
 */

const AUTH_COOKIE_NAME = "admin_auth_token";



/**
 * extract_token_from_request()
 * ----------------------------
 * Extracts the JWT from either the Authorization
 * header (Bearer scheme) or the HttpOnly cookie.
 * Cookie takes precedence over the header.
 *
 * Parameters:
 * -----------
 * request : Express Request Object
 *
 * Returns:
 * --------
 * string | null
 */

const extract_token_from_request = (request) => {

    /**
     * Prefer the HttpOnly cookie for browser-based
     * dashboard requests.
     */

    const raw_cookie_header = request.headers.cookie || "";

    if (raw_cookie_header) {

        const cookies = raw_cookie_header
            .split(";")
            .reduce((accumulator, cookie_pair) => {

                const separator_index = cookie_pair.indexOf("=");

                if (separator_index === -1) {

                    return accumulator;

                }

                const cookie_name =
                    cookie_pair.slice(0, separator_index).trim();

                const cookie_value =
                    cookie_pair.slice(separator_index + 1).trim();

                accumulator[cookie_name] = decodeURIComponent(cookie_value);

                return accumulator;

            }, {});



        if (cookies[AUTH_COOKIE_NAME]) {

            return cookies[AUTH_COOKIE_NAME];

        }

    }



    /**
     * Fall back to Authorization header for
     * API clients and programmatic access.
     */

    const authorization_header = request.headers.authorization;

    if (authorization_header && authorization_header.startsWith("Bearer ")) {

        return authorization_header.split(" ")[1];

    }



    return null;

};



/**
 * verify_admin_authentication()
 * -----------------------------
 * Middleware that verifies admin JWT.
 * Accepts tokens from HttpOnly cookies or
 * Authorization: Bearer headers.
 *
 * Parameters:
 * -----------
 * request  : Express Request Object
 * response : Express Response Object
 * next     : Express Next Function
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

        const token = extract_token_from_request(request);



        if (!token) {

            return response.status(401).json({

                success: false,

                message: "Authentication required."

            });

        }



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

            message: "Invalid or expired authentication token."

        });

    }

};



export default verify_admin_authentication;
