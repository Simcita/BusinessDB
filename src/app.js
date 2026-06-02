import express from "express";

import cors from "cors";

import helmet from "helmet";

import morgan from "morgan";

import { api_rate_limiter } from "./middleware/rate-limit.middleware.js";

import health_routes from "./routes/health.routes.js";

import global_error_handler from "./middleware/error.middleware.js";

import verification_routes from "./routes/verification.routes.js";

import admin_routes from "./routes/admin.routes.js";

import admin_auth_routes from "./routes/admin-auth.routes.js";

/**
 * app
 * ---
 * Main Express application instance.
 */

const app = express();



/**
 * APPLICATION MIDDLEWARE
 * ----------------------
 * Registers global middleware.
 */

app.use(express.json());

app.use(cors());

app.use(helmet());

app.use(morgan("dev"));



/**
 * APPLICATION ROUTES
 * ------------------
 * Registers all application routes.
 */

app.use(

    "/health",

    health_routes

);



/**
 * ERROR HANDLER
 * -------------
 * Registers global error middleware.
 */

app.use(global_error_handler);

app.use(
    "api/",
    api_rate_limiter
)

/**
 * VERIFICATION ROUTES
 * ------------------
 * Registers verification-related routes.
 */

app.use(

    "/api",

    verification_routes

);


app.use(

    "/admin",

    admin_routes

);

app.use(

    "/admin/auth",

    admin_auth_routes

);





export default app;
