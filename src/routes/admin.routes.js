import express from "express";

import {

    get_dashboard_metrics,

    get_recent_submissions

} from "../controllers/admin.controller.js";

import verify_admin_authentication

    from "../middleware/auth.middleware.js";

import { retry_failed_job } from "../controllers/admin.controller.js";

/**
 * router
 * ------
 * Admin API router instance.
 */

const router = express.Router();

router.use(verify_admin_authentication);

/**
 * GET /metrics
 * ------------
 * Returns dashboard metrics.
 */

router.get(

    "/metrics",

    get_dashboard_metrics

);



/**
 * GET /submissions
 * ----------------
 * Returns recent submissions.
 */

router.get(

    "/submissions",

    get_recent_submissions

);

router.post(

    "/jobs/:job_id/retry",

    retry_failed_job

);



export default router;
