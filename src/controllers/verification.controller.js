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
 *   2. Account ID not yet in XmApprovedAccount
 *      → 202  { type: "PENDING_SIGNUP", affiliateCode, affiliateLink }
 *             Submission is saved as PENDING. The verification worker will
 *             auto-confirm it once the affiliate email arrives from XM.
 *             The response includes the referral code and link so the user
 *             knows how to open an account under the correct IB partner.
 *
 *   3. Account found in approved list
 *      → 202  Pending submission created. The verification
 *             cron worker will confirm and trigger fulfillment
 *             (email + WhatsApp) within the next polling cycle.
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
         * Always save the submission as PENDING regardless of
         * whether the account is in the approved list yet.
         * If the account is not approved yet, the verification
         * worker will auto-match it once the affiliate email
         * arrives — no re-submission needed.
         */

        const submission =

            await create_pending_submission({

                name:               validated_data.name,

                surname:            validated_data.surname,

                email:              validated_data.email,

                phone:              formatted_phone,

                submittedAccountId: validated_data.xm_account_id,

                ipAddress:          request.ip,

                campaignId:         validated_data.campaign_id ?? null

            });



        await create_audit_log(

            "SUBMISSION_CREATED",

            `Pending submission created for account ${validated_data.xm_account_id}.`,

            submission.id

        );



        /**
         * Check whether the account exists in the approved list.
         * Accounts arrive via the Gmail IMAP worker.
         */

        const account_exists =

            await verify_xm_account(

                validated_data.xm_account_id

            );



        /**
         * Account not yet on file — return instructions so the
         * user knows to open an XM account under the IB code.
         * The submission is already saved and will be auto-verified
         * when the affiliate email is processed.
         */

        if (!account_exists) {

            return response.status(202).json({

                success: true,

                type: "PENDING_SIGNUP",

                message:
                    "Your details have been saved. To complete verification, " +
                    "open a new XM account using referral code " +
                    (process.env.AFFILIATE_CODE || "BANDISHARES05") +
                    ". Once your account is active, we'll confirm and reach out automatically.",

                affiliateCode: process.env.AFFILIATE_CODE || "BANDISHARES05",

                affiliateLink: process.env.AFFILIATE_LINK || null,

                submissionId: submission.id

            });

        }



        /**
         * Account found — submission will be matched by the
         * verification worker within the next polling cycle.
         */

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
