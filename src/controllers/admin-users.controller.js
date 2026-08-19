import { z } from "zod";

import {
    get_all_admin_users,
    create_admin_user,
    toggle_admin_user_status
} from "../services/admin-users.service.js";

import { create_admin_user_schema } from "../validators/admin.validators.js";



export const list_users = async (_request, response) => {

    try {

        const users = await get_all_admin_users();

        return response.status(200).json({

            success: true,

            data: users

        });

    }

    catch (error) {

        return response.status(500).json({

            success: false,

            message: error.message

        });

    }

};



export const create_user = async (request, response) => {

    try {

        const validated = create_admin_user_schema.parse(request.body);

        const admin = await create_admin_user({

            ...validated,

            created_by: request.admin.admin_id

        });

        return response.status(201).json({

            success: true,

            data: admin

        });

    }

    catch (error) {

        if (error instanceof z.ZodError) {

            return response.status(400).json({

                success: false,

                message: "Validation failed.",

                errors: error.issues

            });

        }

        return response.status(error.status || 500).json({

            success: false,

            message: error.message

        });

    }

};



export const toggle_user_status = async (request, response) => {

    try {

        const { user_id } = request.params;

        const updated = await toggle_admin_user_status(

            user_id,

            request.admin.admin_id

        );

        return response.status(200).json({

            success: true,

            data: updated

        });

    }

    catch (error) {

        return response.status(error.status || 500).json({

            success: false,

            message: error.message

        });

    }

};
