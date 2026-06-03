import express from "express";

import {
    list_templates,
    get_template,
    add_template,
    edit_template,
    toggle_template
} from "../controllers/template.controller.js";

import verify_admin_authentication
    from "../middleware/auth.middleware.js";

import authorize_roles
    from "../middleware/role.middleware.js";



/**
 * router
 * ------
 * Notification template management routes.
 * All routes require a valid JWT.
 * Mutations require ADMIN or SUPER_ADMIN role.
 */

const router = express.Router();

router.use(verify_admin_authentication);



/**
 * GET /admin/templates
 * --------------------
 * Returns all notification templates.
 */

router.get(
    "/templates",
    list_templates
);



/**
 * GET /admin/templates/:template_id
 * ----------------------------------
 * Returns a single template by UUID.
 */

router.get(
    "/templates/:template_id",
    get_template
);



/**
 * POST /admin/templates
 * ---------------------
 * Creates a new notification template.
 * Requires ADMIN or SUPER_ADMIN role.
 */

router.post(
    "/templates",
    authorize_roles(["ADMIN", "SUPER_ADMIN"]),
    add_template
);



/**
 * PUT /admin/templates/:template_id
 * ----------------------------------
 * Updates an existing template.
 * Requires ADMIN or SUPER_ADMIN role.
 */

router.put(
    "/templates/:template_id",
    authorize_roles(["ADMIN", "SUPER_ADMIN"]),
    edit_template
);



/**
 * PATCH /admin/templates/:template_id/toggle
 * -------------------------------------------
 * Toggles active status of a template.
 * Requires ADMIN or SUPER_ADMIN role.
 */

router.patch(
    "/templates/:template_id/toggle",
    authorize_roles(["ADMIN", "SUPER_ADMIN"]),
    toggle_template
);



export default router;
