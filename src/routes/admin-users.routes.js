import express from "express";

import {
    list_users,
    create_user,
    toggle_user_status
} from "../controllers/admin-users.controller.js";

import verify_admin_authentication
    from "../middleware/auth.middleware.js";

import authorize_roles
    from "../middleware/role.middleware.js";



const router = express.Router();

router.use(verify_admin_authentication);

router.use(authorize_roles(["SUPER_ADMIN"]));



router.get("/users", list_users);

router.post("/users", create_user);

router.patch("/users/:user_id/toggle", toggle_user_status);



export default router;
