import prisma from "../config/database.js";

import logger from "../utils/logger.js";

import { create_audit_log } from "./audit.service.js";



/**
 * create_campaign()
 * -----------------
 * Creates a new affiliate campaign record.
 *
 * Parameters:
 * -----------
 * campaign_data : object
 *      campaignName : string
 *      brokerName   : string
 *      whopLink     : string
 *      isActive     : boolean  (optional, defaults true)
 *
 * admin_id : string  — UUID of the creating admin
 *
 * Returns:
 * --------
 * Promise<object>  — created Campaign record
 */

export const create_campaign = async (

    campaign_data,
    admin_id

) => {

    const new_campaign = await prisma.campaign.create({

        data: {

            campaignName: campaign_data.campaignName,

            brokerName: campaign_data.brokerName,

            whopLink: campaign_data.whopLink,

            isActive: campaign_data.isActive ?? true

        }

    });



    await create_audit_log(

        "CAMPAIGN_CREATED",

        `Admin ${admin_id} created campaign "${new_campaign.campaignName}".`,

        new_campaign.id

    );



    logger.info(`Campaign created: ${new_campaign.id}`);

    return new_campaign;

};



/**
 * get_all_campaigns()
 * -------------------
 * Returns all campaigns ordered by creation date.
 * Includes a count of linked submissions.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * Promise<array>
 */

export const get_all_campaigns = async () => {

    return prisma.campaign.findMany({

        orderBy: {
            createdAt: "desc"
        },

        include: {
            _count: {
                select: {
                    submissions: true
                }
            }
        }

    });

};



/**
 * get_campaign_by_id()
 * --------------------
 * Returns a single campaign by its UUID.
 *
 * Parameters:
 * -----------
 * campaign_id : string
 *
 * Returns:
 * --------
 * Promise<object | null>
 */

export const get_campaign_by_id = async (

    campaign_id

) => {

    return prisma.campaign.findUnique({

        where: {
            id: campaign_id
        },

        include: {
            _count: {
                select: {
                    submissions: true
                }
            }
        }

    });

};



/**
 * update_campaign()
 * -----------------
 * Partially updates a campaign record.
 *
 * Parameters:
 * -----------
 * campaign_id   : string
 * update_data   : object  — partial Campaign fields
 * admin_id      : string
 *
 * Returns:
 * --------
 * Promise<object>  — updated Campaign record
 */

export const update_campaign = async (

    campaign_id,
    update_data,
    admin_id

) => {

    const updated_campaign = await prisma.campaign.update({

        where: {
            id: campaign_id
        },

        data: update_data

    });



    await create_audit_log(

        "CAMPAIGN_UPDATED",

        `Admin ${admin_id} updated campaign "${updated_campaign.campaignName}".`,

        campaign_id

    );



    logger.info(`Campaign updated: ${campaign_id}`);

    return updated_campaign;

};



/**
 * toggle_campaign_status()
 * ------------------------
 * Flips the isActive flag on a campaign.
 *
 * Parameters:
 * -----------
 * campaign_id : string
 * admin_id    : string
 *
 * Returns:
 * --------
 * Promise<object>  — updated Campaign record
 */

export const toggle_campaign_status = async (

    campaign_id,
    admin_id

) => {

    const existing_campaign = await prisma.campaign.findUnique({

        where: {
            id: campaign_id
        }

    });



    if (!existing_campaign) {

        return null;

    }



    const updated_campaign = await prisma.campaign.update({

        where: {
            id: campaign_id
        },

        data: {
            isActive: !existing_campaign.isActive
        }

    });



    const action = updated_campaign.isActive ? "activated" : "deactivated";

    await create_audit_log(

        "CAMPAIGN_STATUS_TOGGLED",

        `Admin ${admin_id} ${action} campaign "${updated_campaign.campaignName}".`,

        campaign_id

    );



    logger.info(
        `Campaign ${campaign_id} ${action}.`
    );

    return updated_campaign;

};



/**
 * delete_campaign()
 * -----------------
 * Permanently deletes a campaign record.
 * Only campaigns with zero linked submissions
 * may be deleted.
 *
 * Parameters:
 * -----------
 * campaign_id : string
 * admin_id    : string
 *
 * Returns:
 * --------
 * Promise<object>  — deleted Campaign record
 *
 * Throws:
 * -------
 * Error  — when campaign has existing submissions
 */

export const delete_campaign = async (

    campaign_id,
    admin_id

) => {

    const submission_count = await prisma.userSubmission.count({

        where: {
            campaignId: campaign_id
        }

    });



    if (submission_count > 0) {

        throw new Error(

            `Cannot delete campaign with ${submission_count} existing submission(s).`

        );

    }



    const deleted_campaign = await prisma.campaign.delete({

        where: {
            id: campaign_id
        }

    });



    await create_audit_log(

        "CAMPAIGN_DELETED",

        `Admin ${admin_id} deleted campaign "${deleted_campaign.campaignName}".`,

        campaign_id

    );



    logger.info(`Campaign deleted: ${campaign_id}`);

    return deleted_campaign;

};
