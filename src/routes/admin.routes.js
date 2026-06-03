import express from "express";

import {
    get_dashboard_metrics,
    get_submissions,
    get_jobs,
    retry_job,
    get_parser_logs,
    get_approved_accounts,
    get_audit_logs,
    get_dead_letter_jobs
} from "../controllers/admin.controller.js";

import verify_admin_authentication
    from "../middleware/auth.middleware.js";

import authorize_roles
    from "../middleware/role.middleware.js";



/**
 * router
 * ------
 * Protected admin API router.
 * All routes require a valid JWT.
 */

const router = express.Router();

router.use(verify_admin_authentication);



/**
 * GET /admin/metrics
 * ------------------
 * Returns a live system metrics snapshot.
 */

router.get(
    "/metrics",
    get_dashboard_metrics
);



/**
 * GET /admin/submissions
 * ----------------------
 * Returns paginated user submissions.
 * Supports ?page, ?limit, ?status, ?search.
 */

router.get(
    "/submissions",
    get_submissions
);



/**
 * GET /admin/jobs
 * ---------------
 * Returns paginated fulfillment jobs.
 * Supports ?page, ?limit, ?status, ?channel.
 */

router.get(
    "/jobs",
    get_jobs
);



/**
 * POST /admin/jobs/:job_id/retry
 * ------------------------------
 * Manually resets a failed job back to PENDING.
 * Requires ADMIN or SUPER_ADMIN role.
 */

router.post(
    "/jobs/:job_id/retry",
    authorize_roles(["ADMIN", "SUPER_ADMIN"]),
    retry_job
);



/**
 * GET /admin/jobs/failed
 * ----------------------
 * Returns dead-letter queue entries.
 */

router.get(
    "/jobs/failed",
    get_dead_letter_jobs
);



/**
 * GET /admin/parser-logs
 * ----------------------
 * Returns paginated Gmail parser logs.
 * Supports ?page, ?limit.
 */

router.get(
    "/parser-logs",
    get_parser_logs
);



/**
 * GET /admin/accounts
 * -------------------
 * Returns paginated XM approved accounts.
 * Supports ?page, ?limit.
 */

router.get(
    "/accounts",
    get_approved_accounts
);



/**
 * GET /admin/audit-logs
 * ---------------------
 * Returns paginated audit trail.
 * Supports ?page, ?limit, ?event_type.
 */

router.get(
    "/audit-logs",
    authorize_roles(["ADMIN", "SUPER_ADMIN"]),
    get_audit_logs
);



export default router;
