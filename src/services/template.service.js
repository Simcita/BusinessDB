import prisma from "../config/database.js";

import logger from "../utils/logger.js";

import { create_audit_log } from "./audit.service.js";



/**
 * create_template()
 * -----------------
 * Creates a new notification template record.
 *
 * Parameters:
 * -----------
 * template_data : object
 *      templateName     : string
 *      notificationType : "WHATSAPP" | "EMAIL"
 *      subjectLine      : string  (optional)
 *      templateBody     : string
 *      isActive         : boolean (optional, defaults true)
 *
 * admin_id : string
 *
 * Returns:
 * --------
 * Promise<object>  — created NotificationTemplate record
 */

export const create_template = async (

    template_data,
    admin_id

) => {

    const new_template = await prisma.notificationTemplate.create({

        data: {

            templateName: template_data.templateName,

            notificationType: template_data.notificationType,

            subjectLine: template_data.subjectLine ?? null,

            templateBody: template_data.templateBody,

            isActive: template_data.isActive ?? true

        }

    });



    await create_audit_log(

        "TEMPLATE_CREATED",

        `Admin ${admin_id} created template "${new_template.templateName}".`,

        new_template.id

    );



    logger.info(`Template created: ${new_template.id}`);

    return new_template;

};



/**
 * get_all_templates()
 * -------------------
 * Returns all notification templates ordered
 * by creation date.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * Promise<array>
 */

export const get_all_templates = async () => {

    return prisma.notificationTemplate.findMany({

        orderBy: {
            createdAt: "desc"
        }

    });

};



/**
 * get_template_by_id()
 * --------------------
 * Returns a single template by its UUID.
 *
 * Parameters:
 * -----------
 * template_id : string
 *
 * Returns:
 * --------
 * Promise<object | null>
 */

export const get_template_by_id = async (

    template_id

) => {

    return prisma.notificationTemplate.findUnique({

        where: {
            id: template_id
        }

    });

};



/**
 * update_template()
 * -----------------
 * Partially updates a template record.
 * notificationType cannot be changed after creation.
 *
 * Parameters:
 * -----------
 * template_id  : string
 * update_data  : object — partial template fields
 * admin_id     : string
 *
 * Returns:
 * --------
 * Promise<object>
 */

export const update_template = async (

    template_id,
    update_data,
    admin_id

) => {

    const updated_template = await prisma.notificationTemplate.update({

        where: {
            id: template_id
        },

        data: update_data

    });



    await create_audit_log(

        "TEMPLATE_UPDATED",

        `Admin ${admin_id} updated template "${updated_template.templateName}".`,

        template_id

    );



    logger.info(`Template updated: ${template_id}`);

    return updated_template;

};



/**
 * toggle_template_status()
 * ------------------------
 * Flips the isActive flag on a template.
 *
 * Parameters:
 * -----------
 * template_id : string
 * admin_id    : string
 *
 * Returns:
 * --------
 * Promise<object | null>
 */

export const toggle_template_status = async (

    template_id,
    admin_id

) => {

    const existing_template = await prisma.notificationTemplate.findUnique({

        where: {
            id: template_id
        }

    });



    if (!existing_template) {

        return null;

    }



    const updated_template = await prisma.notificationTemplate.update({

        where: {
            id: template_id
        },

        data: {
            isActive: !existing_template.isActive
        }

    });



    const action = updated_template.isActive ? "activated" : "deactivated";

    await create_audit_log(

        "TEMPLATE_STATUS_TOGGLED",

        `Admin ${admin_id} ${action} template "${updated_template.templateName}".`,

        template_id

    );



    logger.info(`Template ${template_id} ${action}.`);

    return updated_template;

};
