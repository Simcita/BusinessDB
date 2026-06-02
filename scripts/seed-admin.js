import prisma from "../src/config/database.js";

import {

    hash_password

} from "../src/utils/password.js";



/**
 * seed_admin_user()
 * -----------------
 * Creates initial super admin account.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * Promise<void>
 */

const seed_admin_user = async () => {

    try {

        /**
         * Hash admin password.
         */

        const password_hash =

            await hash_password(

                "ChangeMe123!"

            );



        /**
         * Create admin account.
         */

        const admin_user =

            await prisma.adminUser.create({

                data: {

                    fullName: "System Administrator",

                    email: "admin@sharesworldwide.trade",

                    passwordHash: password_hash,

                    role: "SUPER_ADMIN"

                }

            });



        console.log(

            "Admin user created:",

            admin_user.email

        );

    }

    catch (error) {

        console.error(error.message);

    }

    finally {

        await prisma.$disconnect();

    }

};



seed_admin_user();
