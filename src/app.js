import express from "express";

import cors from "cors";

import helmet from "helmet";

import morgan from "morgan";

import { api_rate_limiter } from "./middleware/rate-limit.middleware.js";

import health_routes from "./routes/health.routes.js";

import verification_routes from "./routes/verification.routes.js";

import admin_auth_routes from "./routes/admin-auth.routes.js";

import admin_routes from "./routes/admin.routes.js";

import campaign_routes from "./routes/campaign.routes.js";

import template_routes from "./routes/template.routes.js";

import global_error_handler from "./middleware/error.middleware.js";



/**
 * app
 * ---
 * Main Express application instance.
 */

const app = express();

app.set('trust proxy', 1);



/**
 * SECURITY MIDDLEWARE
 * -------------------
 * Applied before all routes.
 */

app.use(helmet());

const allowed_origins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

app.use(
    cors({
        origin: allowed_origins,
        credentials: true
    })
);

app.use(express.json());

app.use(morgan("dev"));



/**
 * HEALTH ROUTE
 * ------------
 * No rate limiting on health check.
 */

app.use(
    "/health",
    health_routes
);



/**
 * PUBLIC API ROUTES
 * -----------------
 * Rate-limited public endpoints.
 */

app.use(
    "/api",
    api_rate_limiter,
    verification_routes
);



/**
 * ADMIN AUTH ROUTES
 * -----------------
 * Must be mounted before /admin to allow
 * unauthenticated login requests through.
 */

app.use(
    "/admin/auth",
    admin_auth_routes
);



/**
 * ADMIN PROTECTED ROUTES
 * ----------------------
 * All routes below require valid JWT.
 */

app.use(
    "/admin",
    admin_routes
);

app.use(
    "/admin",
    campaign_routes
);

app.use(
    "/admin",
    template_routes
);



/**
 * GLOBAL ERROR HANDLER
 * --------------------
 * Must be registered last, after all routes.
 */

app.use(global_error_handler);



export default app;
