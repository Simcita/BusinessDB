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
 * Sends the XM verification success email
 * using the Resend API.
 *
 * Parameters:
 * -----------
 * recipient_email : string
 * customer_name   : string
 * xm_account_id  : string
 * whop_link       : string  — campaign-specific link, falls back to env
 *
 * Returns:
 * --------
 * Promise<{ success: boolean, response: object | string }>
 */

export const send_verification_email = async (

    recipient_email,
    customer_name,
    xm_account_id,
    whop_link = process.env.WHOP_LINK

) => {

    try {

        const response = await resend.emails.send({

            from: process.env.EMAIL_FROM,

            to: recipient_email,

            subject: "Your XM Verification Was Successful",

            html: `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                </head>
                <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">

                    <h2 style="color: #1a1a1a;">Hello ${customer_name},</h2>

                    <p style="color: #444;">
                        Your XM Account ID <strong>${xm_account_id}</strong>
                        has been verified successfully.
                    </p>

                    <p style="color: #444;">
                        Click the button below to access your discounted community access.
                    </p>

                    <a
                        href="${whop_link}"
                        style="
                            display: inline-block;
                            background-color: #0070f3;
                            color: #ffffff;
                            padding: 12px 24px;
                            border-radius: 6px;
                            text-decoration: none;
                            font-weight: 600;
                        "
                    >
                        Access Community
                    </a>

                    <p style="color: #888; font-size: 12px; margin-top: 32px;">
                        This email was sent by sharesworldwide.trade
                    </p>

                </body>
                </html>
            `

        });



        logger.info(

            `Verification email sent to ${recipient_email}`

        );



        return {

            success: true,

            response

        };

    }

    catch (error) {

        logger.error(

            `Email delivery failed for ${recipient_email}: ${error.message}`

        );



        return {

            success: false,

            response: error.message

        };

    }

};
