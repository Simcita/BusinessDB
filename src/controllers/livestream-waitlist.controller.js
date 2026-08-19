import { z } from "zod";

import {

    create_waitlist_entry,

    create_waitlist_entry_by_admin,

    get_paginated_waitlist_entries,

    send_links_to_waitlist,

    send_link_to_one_entry

} from "../services/livestream-waitlist.service.js";

import {

    livestream_waitlist_signup_schema

} from "../utils/validation.js";

import {

    waitlist_filter_schema,

    send_waitlist_links_schema,

    add_waitlist_entry_schema

} from "../validators/admin.validators.js";



/**
 * signup_for_waitlist()
 * -----------------------
 * Public livestream waitlist signup. No auth required.
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

export const signup_for_waitlist = async (

    request,
    response

) => {

    try {

        const validated_body =
            livestream_waitlist_signup_schema.parse(request.body);

        const entry = await create_waitlist_entry(validated_body);

        return response.status(201).json({

            success: true,

            data: entry

        });

    }

    catch (error) {

        if (error instanceof z.ZodError) {

            return response.status(400).json({

                success: false,

                message: "Validation failed.",

                errors: error.errors

            });

        }

        return response.status(error.status || 500).json({

            success: false,

            message: error.message

        });

    }

};



/**
 * list_waitlist_entries()
 * --------------------------
 * Returns paginated, optionally status-filtered waitlist
 * entries. Requires a valid admin JWT (SUPPORT+).
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

export const list_waitlist_entries = async (

    request,
    response

) => {

    try {

        const validated_query =
            waitlist_filter_schema.parse(request.query);

        const result = await get_paginated_waitlist_entries({

            page: validated_query.page,

            limit: validated_query.limit,

            status: validated_query.status

        });

        return response.status(200).json({

            success: true,

            data: result.data,

            meta: result.meta

        });

    }

    catch (error) {

        if (error instanceof z.ZodError) {

            return response.status(400).json({

                success: false,

                message: "Invalid query parameters.",

                errors: error.errors

            });

        }

        return response.status(500).json({

            success: false,

            message: error.message

        });

    }

};



/**
 * send_waitlist_links()
 * ------------------------
 * Bulk-sends Discord + Telegram invite links to every
 * PENDING or FAILED waitlist entry. Requires ADMIN or
 * SUPER_ADMIN role.
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

export const send_waitlist_links = async (

    request,
    response

) => {

    try {

        const validated_body =
            send_waitlist_links_schema.parse(request.body);

        const result = await send_links_to_waitlist(

            validated_body,

            request.admin.admin_id

        );

        return response.status(200).json({

            success: true,

            data: result

        });

    }

    catch (error) {

        if (error instanceof z.ZodError) {

            return response.status(400).json({

                success: false,

                message: "Validation failed.",

                errors: error.errors

            });

        }

        return response.status(error.status || 500).json({

            success: false,

            message: error.message

        });

    }

};



/**
 * send_single_waitlist_link()
 * -------------------------------
 * Sends the Discord + Telegram invite links to one
 * admin-chosen waitlist entry, regardless of its current
 * status. Requires ADMIN or SUPER_ADMIN role.
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

export const send_single_waitlist_link = async (

    request,
    response

) => {

    try {

        const { entry_id } = request.params;

        const validated_body =
            send_waitlist_links_schema.parse(request.body);

        const updated_entry = await send_link_to_one_entry(

            entry_id,

            validated_body,

            request.admin.admin_id

        );

        return response.status(200).json({

            success: true,

            data: updated_entry

        });

    }

    catch (error) {

        if (error instanceof z.ZodError) {

            return response.status(400).json({

                success: false,

                message: "Validation failed.",

                errors: error.errors

            });

        }

        return response.status(error.status || 500).json({

            success: false,

            message: error.message

        });

    }

};



/**
 * add_waitlist_entry()
 * ------------------------
 * Manually adds someone to the waitlist as an admin — no XM
 * account lookup required, unlike the public signup. Requires
 * ADMIN or SUPER_ADMIN role.
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

export const add_waitlist_entry = async (

    request,
    response

) => {

    try {

        const validated_body =
            add_waitlist_entry_schema.parse(request.body);

        const entry = await create_waitlist_entry_by_admin(

            validated_body,

            request.admin.admin_id

        );

        return response.status(201).json({

            success: true,

            data: entry

        });

    }

    catch (error) {

        if (error instanceof z.ZodError) {

            return response.status(400).json({

                success: false,

                message: "Validation failed.",

                errors: error.errors

            });

        }

        return response.status(error.status || 500).json({

            success: false,

            message: error.message

        });

    }

};
