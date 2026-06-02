import { Resend } from "resend";

import logger from "../utils/logger.js";



/**
 * resend
 * ------
 * Resend email client instance.
 */

const resend = new Resend(

    process.env.RESEND_API_KEY

);



/**
 * send_verification_email()
 * -------------------------
 * Sends XM verification success email.
 *
 * Parameters:
 * -----------
 * recipient_email : string
 *
 * customer_name : string
 *
 * xm_account_id : string
 *
 * Returns:
 * --------
 * Promise<object>
 */

export const send_verification_email = async (

    recipient_email,
    customer_name,
    xm_account_id

) => {

    try {

        const response = await resend.emails.send({

            from: process.env.EMAIL_FROM,

            to: recipient_email,

            subject: "Your XM Verification Was Successful",

            html: `

                <h2>Hello ${customer_name},</h2>

                <p>

                    Your XM Account ID
                    <strong>${xm_account_id}</strong>
                    has been verified successfully.

                </p>

                <p>

                    Click below to access your discounted community access.

                </p>

                <a href="${process.env.WHOP_LINK}">

                    Access Community

                </a>

            `

        });



        logger.info(

            `Email sent to ${recipient_email}`

        );



        return {

            success: true,

            response

        };

    }

    catch (error) {

        logger.error(

            error.message

        );



        return {

            success: false,

            response: error.message

        };

    }

};
