import express from "express";

import {
    get_health_status
} from "../controllers/health.controller.js";



/**
 * router
 * ------
 * Express router instance for
 * health check routes.
 */

const router = express.Router();



/**
 * GET /
 * ----
 * Health check endpoint.
 */

router.get(

    "/",

    get_health_status

);



export default router;
