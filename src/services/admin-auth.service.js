import prisma from "../config/database.js";

import {

    compare_password

} from "../utils/password.js";



/**
 * authenticate_admin_user()
 * -------------------------
 * Authenticates admin login credentials.
 *
 * Parameters:
 * -----------
 * email : string
 *
 * password : string
 *
 * Returns:
 * --------
 * Promise<object | null>
 */

export const authenticate_admin_user = async (

    email,
    password

) => {

    /**
     * Find admin user.
     */

    const admin_user =

        await prisma.adminUser.findUnique({

            where: {

                email

            }

        });



    /**
     * Reject missing user.
     */

    if (!admin_user) {

        return null;

    }



    /**
     * Verify password.
     */

    const password_matches =

        await compare_password(

            password,

            admin_user.passwordHash

        );



    if (!password_matches) {

        return null;

    }



    /**
     * Update login timestamp.
     */

    await prisma.adminUser.update({

        where: {

            id: admin_user.id

        },

        data: {

            lastLoginAt: new Date()

        }

    });



    return admin_user;

};
