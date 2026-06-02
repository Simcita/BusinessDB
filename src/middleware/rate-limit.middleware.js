import rateLimit from "express-rate-limit";



/**
 * api_rate_limiter
 * ----------------
 * Protects public API endpoints
 * from abuse and spam.
 */

export const api_rate_limiter = rateLimit({

    windowMs: 15 * 60 * 1000,

    max: 100,

    standardHeaders: true,

    legacyHeaders: false,

    message: {

        success: false,

        message: "Too many requests."

    }

});
