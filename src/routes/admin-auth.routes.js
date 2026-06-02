import express from "express";

import {

    admin_login

} from "../controllers/admin-auth.controller.js";

import verify_admin_authentication
    from "../middleware/auth.middleware.js";


/**
 * router
 * ------
 * Admin authentication routes.
 */

const router = express.Router();

router.use(

    verify_admin_authentication

);


/**
 * POST /login
 * ------------
 * Admin login endpoint.
 */

router.post(

    "/login",

    admin_login

);



export default router;
