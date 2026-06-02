import express from "express";

import {

    verify_xm_submission

} from "../controllers/verification.controller.js";



/**
 * router
 * ------
 * Verification route handler.
 */

const router = express.Router();



/**
 * POST /verify-xm
 * ---------------
 * XM verification endpoint.
 */

router.post(

    "/verify-xm",

    verify_xm_submission

);



export default router;
