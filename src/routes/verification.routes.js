import express from "express";

import {

    verify_xm_submission,

    check_account

} from "../controllers/verification.controller.js";

import {

    signup_for_waitlist

} from "../controllers/livestream-waitlist.controller.js";



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



/**
 * GET /check-account
 * -------------------
 * Public "Door Check" endpoint. Returns only
 * { found: boolean } — no auth required.
 */

router.get(

    "/check-account",

    check_account

);



/**
 * POST /livestream-waitlist
 * ---------------------------
 * Public livestream waitlist signup. Looks up the MT
 * account ID synchronously in the same request — no
 * queue/worker involved.
 */

router.post(

    "/livestream-waitlist",

    signup_for_waitlist

);



export default router;
