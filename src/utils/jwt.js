import jwt from "jsonwebtoken";



/**
 * generate_admin_token()
 * ----------------------
 * Generates JWT token for admin user.
 *
 * Parameters:
 * -----------
 * admin_user : object
 *
 * Returns:
 * --------
 * string
 */

export const generate_admin_token = (

    admin_user

) => {

    return jwt.sign(

        {

            admin_id: admin_user.id,

            role: admin_user.role

        },

        process.env.JWT_SECRET,

        {

            expiresIn: "7d"

        }

    );

};
