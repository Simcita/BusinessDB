import prisma from "../config/database.js";

import { hash_password } from "../utils/password.js";

import { create_audit_log } from "./audit.service.js";



export const get_all_admin_users = async () => {

    return prisma.adminUser.findMany({

        select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
            updatedAt: true
        },

        orderBy: { createdAt: "desc" }

    });

};



export const create_admin_user = async ({

    fullName,
    email,
    password,
    role = "ADMIN",
    created_by

}) => {

    const existing = await prisma.adminUser.findUnique({ where: { email } });

    if (existing) {
        const error = new Error("An admin with that email already exists.");
        error.status = 409;
        throw error;
    }

    const passwordHash = await hash_password(password);

    const admin = await prisma.adminUser.create({

        data: { fullName, email, passwordHash, role },

        select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true
        }

    });

    await create_audit_log(
        "ADMIN_USER_CREATED",
        `Admin ${created_by} created new admin user ${email} with role ${role}.`,
        admin.id
    );

    return admin;

};



export const toggle_admin_user_status = async (user_id, performed_by) => {

    if (user_id === performed_by) {
        const error = new Error("You cannot deactivate your own account.");
        error.status = 400;
        throw error;
    }

    const target = await prisma.adminUser.findUnique({ where: { id: user_id } });

    if (!target) {
        const error = new Error("Admin user not found.");
        error.status = 404;
        throw error;
    }

    const updated = await prisma.adminUser.update({

        where: { id: user_id },

        data: { isActive: !target.isActive },

        select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            isActive: true,
            updatedAt: true
        }

    });

    await create_audit_log(
        "ADMIN_USER_TOGGLED",
        `Admin ${performed_by} ${updated.isActive ? "activated" : "deactivated"} user ${target.email}.`,
        user_id
    );

    return updated;

};
