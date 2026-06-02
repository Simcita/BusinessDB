import { ImapFlow } from "imapflow";

import { simpleParser } from "mailparser";



import prisma from "../config/database.js";

import logger from "../utils/logger.js";

import {
    extract_xm_account_id
} from "../utils/xm.parser.js";



/**
 * create_imap_client()
 * --------------------
 * Creates IMAPFlow client instance.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * ImapFlow Client
 */

const create_imap_client = () => {

    return new ImapFlow({

        host: process.env.IMAP_HOST,

        port: Number(process.env.IMAP_PORT),

        secure: true,

        auth: {

            user: process.env.IMAP_USER,

            pass: process.env.IMAP_PASS

        }

    });

};



/**
 * save_parser_log()
 * -----------------
 * Stores parser activity logs.
 *
 * Parameters:
 * -----------
 * log_data : object
 *
 * Returns:
 * --------
 * Promise<void>
 */

const save_parser_log = async (

    log_data

) => {

    await prisma.parserLog.create({

        data: log_data

    });

};



/**
 * save_xm_account()
 * -----------------
 * Stores XM account ID into database.
 *
 * Parameters:
 * -----------
 * account_id : string
 *
 * subject : string
 *
 * sender : string
 *
 * excerpt : string
 *
 * Returns:
 * --------
 * Promise<void>
 */

const save_xm_account = async (

    account_id,
    subject,
    sender,
    excerpt

) => {

    /**
     * Prevent duplicate account inserts.
     */

    const existing_account =

        await prisma.xmApprovedAccount.findUnique({

            where: {

                accountId: account_id

            }

        });



    /**
     * Skip duplicates.
     */

    if (existing_account) {

        logger.info(

            `Duplicate XM account skipped: ${account_id}`

        );

        return;

    }



    /**
     * Save new XM account.
     */

    await prisma.xmApprovedAccount.create({

        data: {

            accountId: account_id,

            emailSubject: subject,

            senderEmail: sender,

            rawEmailExcerpt: excerpt

        }

    });



    logger.info(

        `XM account saved: ${account_id}`

    );

};



/**
 * process_email_message()
 * -----------------------
 * Processes individual email message.
 *
 * Parameters:
 * -----------
 * message : object
 *
 * client : ImapFlow Client
 *
 * Returns:
 * --------
 * Promise<void>
 */

const process_email_message = async (message, client) => {
    try {
        // Download email and get the readable stream
        const { content } = await client.download(message.uid);

        // Pass the stream directly to simpleParser
        const parsed_email = await simpleParser(content);

        const email_subject = parsed_email.subject || "";
        const sender_email = parsed_email.from?.text || "";
        const email_text = parsed_email.text || "";

        const xm_account_id = extract_xm_account_id(email_text);

        if (!xm_account_id) {
            logger.warn(`Failed to extract XM account ID.`);
            await save_parser_log({
                emailSubject: email_subject,
                senderEmail: sender_email,
                parsingStatus: "FAILED",
                failureReason: "XM account ID not found",
            });
            return;
        }

        await save_xm_account(
            xm_account_id,
            email_subject,
            sender_email,
            email_text.slice(0, 500)
        );

        await save_parser_log({
            emailSubject: email_subject,
            senderEmail: sender_email,
            parsingStatus: "SUCCESS",
            extractedAccountId: xm_account_id,
        });

        logger.info(`Processed XM account: ${xm_account_id}`);
    } catch (error) {
        logger.error(error.message);
    }
};



/**
 * process_xm_emails()
 * -------------------
 * Connects to IMAP inbox and processes
 * unread XM emails.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * Promise<void>
 */

export const process_xm_emails = async () => {

    const client = create_imap_client();



    try {

        /**
         * Connect to IMAP server.
         */

        await client.connect();



        logger.info(

            "Connected to IMAP server."

        );



        /**
         * Open inbox.
         */

        await client.mailboxOpen("INBOX");



        /**
         * Search unread emails.
         */

        const messages = await client.search({

            seen: false

        });



        logger.info(

            `Found ${messages.length} unread emails.`

        );



        /**
         * Process each email.
         */

        for (const uid of messages) {

            const message = {

                uid

            };



            await process_email_message(

                message,
                client

            );



            /**
             * Mark email as read.
             */

            await client.messageFlagsAdd(

                uid,

                ["\\Seen"]

            );

        }



        /**
         * Logout from IMAP.
         */

        await client.logout();



        logger.info(

            "IMAP session closed."

        );

    }

    catch (error) {

        logger.error(

            error.message

        );

    }

};


export const start_gmail_worker = () => {
    logger.info("Starting Gmail worker.");
    // Run immediately, then every 60 seconds
    process_xm_emails();
    setInterval(() => {
        process_xm_emails();
    }, 60_000); // 1 minute
};
