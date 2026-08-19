import { z } from "zod";



/**
 * verify_xm_schema
 * ----------------
 * Validates XM verification form input.
 */

export const verify_xm_schema = z.object({

    name: z
        .string()
        .min(2),

    surname: z
        .string()
        .min(2),

    email: z
        .string()
        .email(),

    phone: z
        .string()
        .min(10),

    xm_account_id: z
        .string()
        .min(5),

    campaign_id: z
        .uuid()
        .optional()

});



/**
 * check_account_schema
 * ---------------------
 * Validates the public Door Check query parameter.
 */

export const check_account_schema = z.object({

    accountId: z
        .string()
        .min(1)
        .max(50)

});



/**
 * livestream_waitlist_signup_schema
 * -----------------------------------
 * Validates public livestream waitlist signup payload.
 */

export const livestream_waitlist_signup_schema = z.object({

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
