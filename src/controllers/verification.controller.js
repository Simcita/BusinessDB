import {

    verify_xm_account,

    check_active_claim,

    create_pending_submission

} from "../services/verification.service.js";



import {

    verify_xm_schema

} from "../utils/validation.js";



import {

    format_phone_number

} from "../utils/phone.js";



import {

    create_audit_log

} from "../services/audit.service.js";



/**
 * verify_xm_submission()
 * ----------------------
 * Handles XM verification form submissions.
 *
 * Three distinct outcomes:
 *
 *   1. Account already has a PENDING or VERIFIED submission
 *      → 409  "XM account already submitted or verified."
 *
 *   2. Account ID not found in XmApprovedAccount
 *      → 404  { type: "ACCOUNT_NOT_FOUND", instructions, affiliateLink }
 *             The public webapp uses this to show a toast with
 *             instructions on how to sign up through the
 *             affiliate link to qualify for the discount.
 *
 *   3. Account found in approved list
 *      → 202  Pending submission created. The verification
 *             cron worker will confirm and trigger fulfillment
 *             (email + WhatsApp) within the next minute.
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

export const verify_xm_submission = async (

    request,
    response

) => {

    try {

        /**
         * Validate and parse request body.
         */

        const validated_data =

            verify_xm_schema.parse(

                request.body

            );



        /**
         * Normalize phone to E.164 format.
         */

        const formatted_phone =

            format_phone_number(

                validated_data.phone

            );



        /**
         * Block if an active claim (PENDING or VERIFIED)
         * already exists for this account ID.
         */

        const is_active_claim =

            await check_active_claim(

                validated_data.xm_account_id

            );



        if (is_active_claim) {

            return response.status(409).json({

                success: false,

                message: "XM account already submitted or verified."

            });

        }



        /**
         * Check whether the account exists in the approved list.
         * Accounts arrive via the Gmail IMAP worker — if the
         * affiliate email has not been processed yet, this check
         * will return false. Users who have not signed up through
         * the correct affiliate link will always fail here.
         */

        const account_exists =

            await verify_xm_account(

                validated_data.xm_account_id

            );



        if (!account_exists) {

            return response.status(404).json({

                success: false,

                type: "ACCOUNT_NOT_FOUND",

                message: "We don't have your XM account on file.",

                instructions:
                    "To qualify for the discount, you must open your XM account through our affiliate link. " +
                    "Sign up using the link below, then return here once your account is active.",

                affiliateLink: process.env.AFFILIATE_LINK

            });

        }



        /**
         * Account exists. Create a PENDING submission.
         * The verification cron worker will match this against
         * XmApprovedAccount and trigger fulfillment jobs within
         * the next polling cycle (≤ 1 minute).
         */

        const submission =

            await create_pending_submission({

                name:              validated_data.name,

                surname:           validated_data.surname,

                email:             validated_data.email,

                phone:             formatted_phone,

                submittedAccountId: validated_data.xm_account_id,

                ipAddress:         request.ip,

                campaignId:        validated_data.campaign_id ?? null

            });



        await create_audit_log(

            "SUBMISSION_CREATED",

            `Pending submission created for account ${validated_data.xm_account_id}.`,

            submission.id

        );



        return response.status(202).json({

            success: true,

            message:
                "Your account has been submitted for verification. " +
                "You will receive an email and WhatsApp message once confirmed.",

            submissionId: submission.id

        });

    }

    catch (error) {

        return response.status(500).json({

            success: false,

            message: error.message

        });

    }

};
