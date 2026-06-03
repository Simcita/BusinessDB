import express from "express";

import {
    list_campaigns,
    get_campaign,
    add_campaign,
    edit_campaign,
    toggle_campaign,
    remove_campaign
} from "../controllers/campaign.controller.js";

import verify_admin_authentication
    from "../middleware/auth.middleware.js";

import authorize_roles
    from "../middleware/role.middleware.js";



/**
 * router
 * ------
 * Campaign management routes.
 * All routes require a valid JWT.
 * Mutations require ADMIN or SUPER_ADMIN role.
 */

const router = express.Router();

router.use(verify_admin_authentication);



/**
 * GET /admin/campaigns
 * --------------------
 * Returns all campaigns.
 */

router.get(
    "/campaigns",
    list_campaigns
);



/**
 * GET /admin/campaigns/:campaign_id
 * ----------------------------------
 * Returns a single campaign by UUID.
 */

router.get(
    "/campaigns/:campaign_id",
    get_campaign
);



/**
 * POST /admin/campaigns
 * ---------------------
 * Creates a new campaign.
 * Requires ADMIN or SUPER_ADMIN role.
 */

router.post(
    "/campaigns",
    authorize_roles(["ADMIN", "SUPER_ADMIN"]),
    add_campaign
);



/**
 * PUT /admin/campaigns/:campaign_id
 * ----------------------------------
 * Updates an existing campaign.
 * Requires ADMIN or SUPER_ADMIN role.
 */

router.put(
    "/campaigns/:campaign_id",
    authorize_roles(["ADMIN", "SUPER_ADMIN"]),
    edit_campaign
);



/**
 * PATCH /admin/campaigns/:campaign_id/toggle
 * -------------------------------------------
 * Toggles active status of a campaign.
 * Requires ADMIN or SUPER_ADMIN role.
 */

router.patch(
    "/campaigns/:campaign_id/toggle",
    authorize_roles(["ADMIN", "SUPER_ADMIN"]),
    toggle_campaign
);



/**
 * DELETE /admin/campaigns/:campaign_id
 * -------------------------------------
 * Permanently deletes a campaign with no submissions.
 * Requires SUPER_ADMIN role.
 */

router.delete(
    "/campaigns/:campaign_id",
    authorize_roles(["SUPER_ADMIN"]),
    remove_campaign
);



export default router;
