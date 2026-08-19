import express from "express";

import {

    list_waitlist_entries,

    add_waitlist_entry,

    send_waitlist_links,

    send_single_waitlist_link

} from "../controllers/livestream-waitlist.controller.js";

import verify_admin_authentication
    from "../middleware/auth.middleware.js";

import authorize_roles
    from "../middleware/role.middleware.js";



/**
 * router
 * ------
 * Admin livestream waitlist routes.
 * All routes require a valid JWT.
 */

const router = express.Router();

router.use(verify_admin_authentication);



/**
 * GET /admin/waitlist
 * ---------------------
 * Returns paginated waitlist entries. Supports ?page, ?limit,
 * ?status. No role gate beyond a valid JWT — SUPPORT+.
 */

router.get(
    "/waitlist",
    list_waitlist_entries
);



/**
 * POST /admin/waitlist
 * ----------------------
 * Manually adds someone to the waitlist as an admin — no XM
 * account lookup required, unlike the public signup form.
 * Requires ADMIN or SUPER_ADMIN role.
 */

router.post(
    "/waitlist",
    authorize_roles(["ADMIN", "SUPER_ADMIN"]),
    add_waitlist_entry
);



/**
 * POST /admin/waitlist/send-links
 * ----------------------------------
 * Bulk-sends Discord + Telegram invite links to every
 * PENDING or FAILED entry. Requires ADMIN or SUPER_ADMIN role.
 */

router.post(
    "/waitlist/send-links",
    authorize_roles(["ADMIN", "SUPER_ADMIN"]),
    send_waitlist_links
);



/**
 * POST /admin/waitlist/:entry_id/send-link
 * --------------------------------------------
 * Sends the Discord + Telegram invite links to one
 * admin-chosen entry, regardless of its current status.
 * Requires ADMIN or SUPER_ADMIN role.
 */

router.post(
    "/waitlist/:entry_id/send-link",
    authorize_roles(["ADMIN", "SUPER_ADMIN"]),
    send_single_waitlist_link
);



export default router;
