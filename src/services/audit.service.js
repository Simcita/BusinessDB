import prisma from "../config/database.js";



/**
 * create_audit_log()
 * ------------------
 * Stores important system activity logs.
 *
 * Parameters:
 * -----------
 * event_type : string
 *
 * event_description : string
 *
 * entity_id : string | null
 *
 * Returns:
 * --------
 * Promise<void>
 */

export const create_audit_log = async (

    event_type,
    event_description,
    entity_id = null

) => {

    await prisma.auditLog.create({

        data: {

            eventType: event_type,

            eventDescription: event_description,

            entityId: entity_id

        }

    });

};
