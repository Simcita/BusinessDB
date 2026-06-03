import prisma from "../config/database.js";

import logger from "../utils/logger.js";



/**
 * verify_xm_account()
 * -------------------
 * Checks whether an XM account ID exists in the
 * approved-accounts list extracted from affiliate emails.
 * Used by both the verification controller (to gate
 * submissions against unknown accounts) and the
 * verification cron worker (to match PENDING submissions).
 *
 * Parameters:
 * -----------
 * xm_account_id : string
 *
 * Returns:
 * --------
 * Promise<boolean>
 */

export const verify_xm_account = async (

    xm_account_id

) => {

    const existing_account =

        await prisma.xmApprovedAccount.findUnique({

            where: {

                accountId: xm_account_id

            }

        });



    return !!existing_account;

};



/**
 * check_active_claim()
 * --------------------
 * Checks whether a submitted account ID already has an
 * active claim — i.e. a PENDING or VERIFIED submission.
 * Called at form-submission time to prevent duplicates
 * before a row is inserted.
 *
 * Parameters:
 * -----------
 * submitted_account_id : string
 *
 * Returns:
 * --------
 * Promise<boolean>
 */

export const check_active_claim = async (

    submitted_account_id

) => {

    const existing_submission =

        await prisma.userSubmission.findFirst({

            where: {

                submittedAccountId: submitted_account_id,

                status: {
                    in: ["PENDING", "VERIFIED"]
                }

            }

        });



    return !!existing_submission;

};



/**
 * create_pending_submission()
 * ---------------------------
 * Creates a new submission row with status PENDING.
 * Does not require the account to exist in
 * XmApprovedAccount — the cron worker handles matching.
 *
 * Parameters:
 * -----------
 * submission_data : object
 *   { name, surname, email, phone, submittedAccountId,
 *     campaignId?, ipAddress? }
 *
 * Returns:
 * --------
 * Promise<object>  — the created UserSubmission row
 */

export const create_pending_submission = async (

    submission_data

) => {

    const submission =

        await prisma.userSubmission.create({

            data: {

                ...submission_data,

                status: "PENDING"

            }

        });



    logger.info(

        `Pending submission created: ${submission.id}`

    );



    return submission;

};



/**
 * get_pending_submissions_batch()
 * --------------------------------
 * Fetches up to `limit` PENDING submissions ordered by
 * oldest first. Called by the verification cron worker
 * on every tick.
 *
 * Parameters:
 * -----------
 * limit : number  — maximum rows to fetch (default 50)
 *
 * Returns:
 * --------
 * Promise<UserSubmission[]>
 */

export const get_pending_submissions_batch = async (

    limit = 50

) => {

    return await prisma.userSubmission.findMany({

        where: {

            status: "PENDING"

        },

        orderBy: {

            submittedAt: "asc"

        },

        take: limit

    });

};



/**
 * verify_pending_submission()
 * ---------------------------
 * Atomically transitions a PENDING submission to VERIFIED
 * by using an optimistic WHERE status = 'PENDING' guard.
 * Only one concurrent caller can win — the second caller
 * will see count = 0 and receive null.
 *
 * Parameters:
 * -----------
 * submission_id : string  — UUID of the submission
 * xm_account_id : string  — confirmed accountId from XmApprovedAccount
 *
 * Returns:
 * --------
 * Promise<object | null>
 *   — the updated submission row, or null if the race was lost
 */

export const verify_pending_submission = async (

    submission_id,
    xm_account_id

) => {

    const result =

        await prisma.userSubmission.updateMany({

            where: {

                id: submission_id,

                status: "PENDING"

            },

            data: {

                status: "VERIFIED",

                xmAccountId: xm_account_id,

                fulfilledAt: new Date()

            }

        });



    if (result.count === 0) {

        return null;

    }



    return await prisma.userSubmission.findUnique({

        where: {

            id: submission_id

        }

    });

};
