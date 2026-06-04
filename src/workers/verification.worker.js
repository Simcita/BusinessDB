import cron from "node-cron";

import prisma from "../config/database.js";

import logger from "../utils/logger.js";

const POLL_CRON_SCHEDULE =
    process.env.POLL_CRON_SCHEDULE || "*/15 * * * *";

import {

    get_pending_submissions_batch,

    verify_pending_submission

} from "../services/verification.service.js";

import {

    create_fulfillment_jobs

} from "../services/fullfilment.service.js";

import {

    create_audit_log

} from "../services/audit.service.js";



/**
 * VERIFICATION_BATCH_SIZE
 * -----------------------
 * Maximum number of PENDING submissions processed
 * per cron tick. Keeps each tick bounded even if a
 * large backlog accumulates.
 */

const VERIFICATION_BATCH_SIZE = 50;



/**
 * process_pending_submission()
 * ----------------------------
 * Attempts to verify a single PENDING submission by
 * matching its submittedAccountId against XmApprovedAccount.
 *
 * Outcomes:
 *   • Account not in approved list yet  → no-op, retry next tick
 *   • Account found, race won           → VERIFIED + fulfillment jobs
 *   • Account found, another row won    → mark DUPLICATE
 *   • updateMany returned 0             → submission already transitioned
 *
 * Errors are caught and logged individually so a single
 * bad submission cannot halt the rest of the batch.
 *
 * Parameters:
 * -----------
 * submission : UserSubmission row
 *
 * Returns:
 * --------
 * Promise<void>
 */

const process_pending_submission = async (

    submission

) => {

    try {

        /**
         * Check whether the XM account has arrived in the
         * approved-accounts list (added by the Gmail worker).
         */

        const approved_account =

            await prisma.xmApprovedAccount.findUnique({

                where: {

                    accountId: submission.submittedAccountId

                }

            });



        /**
         * Account not yet available — leave as PENDING and
         * wait for the next polling cycle.
         */

        if (!approved_account) {

            return;

        }



        /**
         * Account found. Check whether another submission row
         * has already been VERIFIED for this account ID.
         * This guards against two concurrent PENDING rows
         * (which the unique index normally prevents, but
         * protects against edge cases in test environments).
         */

        const already_verified =

            await prisma.userSubmission.findFirst({

                where: {

                    submittedAccountId: submission.submittedAccountId,

                    status: "VERIFIED"

                }

            });



        if (already_verified) {

            await prisma.userSubmission.update({

                where: {

                    id: submission.id

                },

                data: {

                    status: "DUPLICATE"

                }

            });



            logger.warn(

                `Submission ${submission.id} marked DUPLICATE — account already claimed.`

            );



            return;

        }



        /**
         * Attempt an optimistic-lock transition to VERIFIED.
         * verify_pending_submission() uses updateMany with
         * WHERE status = 'PENDING' so only one concurrent
         * caller can win — the loser receives null.
         */

        const verified_submission =

            await verify_pending_submission(

                submission.id,

                submission.submittedAccountId

            );



        if (!verified_submission) {

            logger.warn(

                `Submission ${submission.id} already transitioned — skipping.`

            );

            return;

        }



        /**
         * Create EMAIL and WHATSAPP fulfillment jobs.
         * The existing fulfillment worker will pick these
         * up on its next polling cycle (≤ 1 minute).
         */

        await create_fulfillment_jobs(

            verified_submission.id

        );



        await create_audit_log(

            "SUBMISSION_VERIFIED",

            `Account ${submission.submittedAccountId} verified — fulfillment queued.`,

            verified_submission.id

        );



        logger.info(

            `Submission ${submission.id} verified. Fulfillment jobs created.`

        );

    }

    catch (error) {

        logger.error(

            `Verification worker error for submission ${submission.id}: ${error.message}`

        );

    }

};



/**
 * run_verification_pass()
 * -----------------------
 * Fetches a batch of PENDING submissions and processes
 * each one sequentially. Called on every cron tick.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * Promise<void>
 */

const run_verification_pass = async () => {

    const pending =

        await get_pending_submissions_batch(

            VERIFICATION_BATCH_SIZE

        );



    if (pending.length === 0) {

        return;

    }



    logger.info(

        `Verification worker: processing ${pending.length} pending submission(s).`

    );



    for (const submission of pending) {

        await process_pending_submission(

            submission

        );

    }

};



/**
 * start_verification_worker()
 * ---------------------------
 * Registers the verification cron job.
 * Runs every minute and matches PENDING submissions
 * against XmApprovedAccount, promoting matches to
 * VERIFIED and queuing fulfillment jobs.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */

export const start_verification_worker = () => {

    if (process.env.DISABLE_JOB_PROCESSING === "true") {

        logger.info("Verification worker disabled via DISABLE_JOB_PROCESSING.");

        return;

    }

    logger.info(
        `Starting verification worker (schedule: ${POLL_CRON_SCHEDULE}).`
    );

    cron.schedule(

        POLL_CRON_SCHEDULE,

        async () => {

            await run_verification_pass();

        }

    );

};
