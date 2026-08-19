import { z } from "zod";



/**
 * admin_login_schema
 * ------------------
 * Validates admin login request body.
 */

export const admin_login_schema = z.object({

    email: z
        .string()
        .email(),

    password: z
        .string()
        .min(8)

});



/**
 * create_campaign_schema
 * ----------------------
 * Validates new campaign creation payload.
 */

export const create_campaign_schema = z.object({

    campaignName: z
        .string()
        .min(3)
        .max(100),

    brokerName: z
        .string()
        .min(2)
        .max(100),

    whopLink: z
        .string()
        .url(),

    isActive: z
        .boolean()
        .optional()

});



/**
 * update_campaign_schema
 * ----------------------
 * Validates campaign update payload.
 * All fields are optional to support partial updates.
 */

export const update_campaign_schema = z.object({

    campaignName: z
        .string()
        .min(3)
        .max(100)
        .optional(),

    brokerName: z
        .string()
        .min(2)
        .max(100)
        .optional(),

    whopLink: z
        .string()
        .url()
        .optional(),

    isActive: z
        .boolean()
        .optional()

});



/**
 * create_template_schema
 * ----------------------
 * Validates notification template creation payload.
 */

export const create_template_schema = z.object({

    templateName: z
        .string()
        .min(3)
        .max(100),

    notificationType: z.enum([
        "WHATSAPP",
        "EMAIL"
    ]),

    subjectLine: z
        .string()
        .max(200)
        .optional(),

    templateBody: z
        .string()
        .min(10),

    isActive: z
        .boolean()
        .optional()

});



/**
 * update_template_schema
 * ----------------------
 * Validates template update payload.
 * All fields are optional to support partial updates.
 */

export const update_template_schema = z.object({

    templateName: z
        .string()
        .min(3)
        .max(100)
        .optional(),

    subjectLine: z
        .string()
        .max(200)
        .optional(),

    templateBody: z
        .string()
        .min(10)
        .optional(),

    isActive: z
        .boolean()
        .optional()

});



/**
 * pagination_schema
 * -----------------
 * Validates paginated list query parameters.
 */

export const pagination_schema = z.object({

    page: z
        .string()
        .optional()
        .transform(value => (value ? parseInt(value, 10) : 1))
        .pipe(z.number().int().min(1)),

    limit: z
        .string()
        .optional()
        .transform(value => (value ? parseInt(value, 10) : 20))
        .pipe(z.number().int().min(1).max(100))

});



/**
 * submissions_filter_schema
 * -------------------------
 * Validates query parameters for submission listing.
 */

export const submissions_filter_schema = pagination_schema.extend({

    status: z.enum([
        "PENDING",
        "VERIFIED",
        "FAILED",
        "DUPLICATE"
    ]).optional(),

    search: z
        .string()
        .max(100)
        .optional()

});



/**
 * jobs_filter_schema
 * ------------------
 * Validates query parameters for job listing.
 */

export const jobs_filter_schema = pagination_schema.extend({

    status: z.enum([
        "PENDING",
        "PROCESSING",
        "COMPLETED",
        "FAILED"
    ]).optional(),

    channel: z.enum([
        "WHATSAPP",
        "EMAIL"
    ]).optional(),

    search: z.string().max(100).optional()

});



export const accounts_filter_schema = pagination_schema.extend({

    search: z.string().max(100).optional()

});



export const parser_logs_filter_schema = pagination_schema.extend({

    search: z.string().max(100).optional()

});



export const audit_logs_filter_schema = pagination_schema.extend({

    event_type: z.string().max(100).optional(),

    search: z.string().max(100).optional()

});



export const create_admin_user_schema = z.object({

    fullName: z.string().min(2).max(100),

    email: z.string().email(),

    password: z.string().min(8),

    role: z.enum(["SUPER_ADMIN", "ADMIN", "SUPPORT"]).optional()

});



/**
 * create_xm_account_schema
 * -------------------------
 * Validates manual XM approved-account creation payload.
 */

export const create_xm_account_schema = z.object({

    accountId: z
        .string()
        .min(1)
        .max(50),

    emailSubject: z
        .string()
        .max(300)
        .optional(),

    senderEmail: z
        .string()
        .email()
        .optional(),

    rawEmailExcerpt: z
        .string()
        .max(2000)
        .optional(),

    parsedSuccessfully: z
        .boolean()
        .optional()

});



/**
 * update_xm_account_schema
 * --------------------------
 * Validates XM approved-account update payload.
 * All fields are optional to support partial updates.
 */

export const update_xm_account_schema = z.object({

    accountId: z
        .string()
        .min(1)
        .max(50)
        .optional(),

    emailSubject: z
        .string()
        .max(300)
        .optional(),

    senderEmail: z
        .string()
        .email()
        .optional(),

    rawEmailExcerpt: z
        .string()
        .max(2000)
        .optional(),

    parsedSuccessfully: z
        .boolean()
        .optional()

});



/**
 * waitlist_filter_schema
 * -------------------------
 * Validates query parameters for admin waitlist listing.
 */

export const waitlist_filter_schema = pagination_schema.extend({

    status: z.enum([
        "PENDING",
        "SENT",
        "FAILED"
    ]).optional()

});



/**
 * send_waitlist_links_schema
 * -----------------------------
 * Validates the bulk waitlist email-send request body.
 */

export const send_waitlist_links_schema = z.object({

    subject: z
        .string()
        .min(1)
        .max(300),

    body: z
        .string()
        .min(1)

});



/**
 * add_waitlist_entry_schema
 * -----------------------------
 * Validates an admin-added waitlist entry. Same shape as the
 * public signup schema, but lives here since this is the
 * admin-only creation path (no XM-account lookup requirement).
 */

export const add_waitlist_entry_schema = z.object({

    name: z
        .string()
        .min(2)
        .max(100),

    surname: z
        .string()
        .min(2)
        .max(100),

    email: z
        .string()
        .email(),

    xmAccountId: z
        .string()
        .min(1)
        .max(50)

});
