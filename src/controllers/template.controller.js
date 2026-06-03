import { z } from "zod";

import {
    create_template,
    get_all_templates,
    get_template_by_id,
    update_template,
    toggle_template_status
} from "../services/template.service.js";

import {
    create_template_schema,
    update_template_schema
} from "../validators/admin.validators.js";



/**
 * list_templates()
 * ----------------
 * Returns all notification templates.
 *
 * Parameters:
 * -----------
 * _request : Express Request Object
 * response : Express Response Object
 *
 * Returns:
 * --------
 * JSON Response
 */

export const list_templates = async (

    _request,
    response

) => {

    try {

        const templates = await get_all_templates();

        return response.status(200).json({

            success: true,

            data: { templates }

        });

    }

    catch (error) {

        return response.status(500).json({

            success: false,

            message: error.message

        });

    }

};



/**
 * get_template()
 * --------------
 * Returns a single template by UUID.
 *
 * Parameters:
 * -----------
 * request  : Express Request Object
 * response : Express Response Object
 *
 * Returns:
 * --------
 * JSON Response
 */

export const get_template = async (

    request,
    response

) => {

    try {

        const { template_id } = request.params;

        const template = await get_template_by_id(template_id);

        if (!template) {

            return response.status(404).json({

                success: false,

                message: "Template not found."

            });

        }

        return response.status(200).json({

            success: true,

            data: { template }

        });

    }

    catch (error) {

        return response.status(500).json({

            success: false,

            message: error.message

        });

    }

};



/**
 * add_template()
 * --------------
 * Creates a new notification template.
 *
 * Parameters:
 * -----------
 * request  : Express Request Object
 * response : Express Response Object
 *
 * Returns:
 * --------
 * JSON Response
 */

export const add_template = async (

    request,
    response

) => {

    try {

        const validated_body =
            create_template_schema.parse(request.body);

        const new_template = await create_template(

            validated_body,

            request.admin.admin_id

        );

        return response.status(201).json({

            success: true,

            data: { template: new_template }

        });

    }

    catch (error) {

        if (error instanceof z.ZodError) {

            return response.status(400).json({

                success: false,

                message: "Validation failed.",

                errors: error.errors

            });

        }

        return response.status(500).json({

            success: false,

            message: error.message

        });

    }

};



/**
 * edit_template()
 * ---------------
 * Partially updates a notification template.
 *
 * Parameters:
 * -----------
 * request  : Express Request Object
 * response : Express Response Object
 *
 * Returns:
 * --------
 * JSON Response
 */

export const edit_template = async (

    request,
    response

) => {

    try {

        const { template_id } = request.params;

        const validated_body =
            update_template_schema.parse(request.body);

        const existing_template =
            await get_template_by_id(template_id);

        if (!existing_template) {

            return response.status(404).json({

                success: false,

                message: "Template not found."

            });

        }

        const updated_template = await update_template(

            template_id,

            validated_body,

            request.admin.admin_id

        );

        return response.status(200).json({

            success: true,

            data: { template: updated_template }

        });

    }

    catch (error) {

        if (error instanceof z.ZodError) {

            return response.status(400).json({

                success: false,

                message: "Validation failed.",

                errors: error.errors

            });

        }

        return response.status(500).json({

            success: false,

            message: error.message

        });

    }

};



/**
 * toggle_template()
 * -----------------
 * Flips the active/inactive status of a template.
 *
 * Parameters:
 * -----------
 * request  : Express Request Object
 * response : Express Response Object
 *
 * Returns:
 * --------
 * JSON Response
 */

export const toggle_template = async (

    request,
    response

) => {

    try {

        const { template_id } = request.params;

        const updated_template = await toggle_template_status(

            template_id,

            request.admin.admin_id

        );

        if (!updated_template) {

            return response.status(404).json({

                success: false,

                message: "Template not found."

            });

        }

        return response.status(200).json({

            success: true,

            data: { template: updated_template }

        });

    }

    catch (error) {

        return response.status(500).json({

            success: false,

            message: error.message

        });

    }

};
