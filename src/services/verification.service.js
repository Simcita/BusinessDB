import prisma from "../config/database.js";

import logger from "../utils/logger.js";



/**
 * verify_xm_account()
 * -------------------
 * Checks whether XM account ID exists.
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
 * check_duplicate_submission()
 * ----------------------------
 * Checks if XM account has already
 * been successfully verified.
 *
 * Parameters:
 * -----------
 * xm_account_id : string
 *
 * Returns:
 * --------
 * Promise<boolean>
 */

export const check_duplicate_submission = async (

    xm_account_id

) => {

    const existing_submission =

        await prisma.userSubmission.findFirst({

            where: {

                xmAccountId: xm_account_id,

                status: "VERIFIED"

            }

        });



    return !!existing_submission;

};



/**
 * create_submission()
 * -------------------
 * Creates new verification submission.
 *
 * Parameters:
 * -----------
 * submission_data : object
 *
 * Returns:
 * --------
 * Promise<object>
 */

export const create_submission = async (

    submission_data

) => {

    const submission =

        await prisma.userSubmission.create({

            data: submission_data

        });



    logger.info(

        `Submission created: ${submission.id}`

    );



    return submission;

};
