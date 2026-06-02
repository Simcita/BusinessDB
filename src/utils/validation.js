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
        .min(5)

});
