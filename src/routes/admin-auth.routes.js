import express from "express";

import {
    admin_login,
    admin_logout
} from "../controllers/admin-auth.controller.js";

import verify_admin_authentication
    from "../middleware/auth.middleware.js";



/**
 * router
 * ------
 * Admin authentication routes.
 * Login is intentionally public — no auth middleware.
 */

const router = express.Router();



/**
 * POST /admin/auth/login
 * ----------------------
 * Public endpoint — does not require a token.
 */

router.post(
    "/login",
    admin_login
);



/**
 * POST /admin/auth/logout
 * -----------------------
 * Clears the HttpOnly auth cookie.
 * Requires valid token to prevent CSRF abuse.
 */

router.post(
    "/logout",
    verify_admin_authentication,
    admin_logout
);



export default router;
