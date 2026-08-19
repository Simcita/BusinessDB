import { z } from "zod";

import {
    create_campaign,
    get_all_campaigns,
    get_campaign_by_id,
    update_campaign,
    toggle_campaign_status,
    delete_campaign
} from "../services/campaign.service.js";

import {
    create_campaign_schema,
    update_campaign_schema
} from "../validators/admin.validators.js";



/**
 * list_campaigns()
 * ----------------
 * Returns all affiliate campaigns.
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

export const list_campaigns = async (

    _request,
    response

) => {

    try {

        const campaigns = await get_all_campaigns();

        return response.status(200).json({

            success: true,

            data: { campaigns }

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
 * get_campaign()
 * --------------
 * Returns a single campaign by UUID.
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

export const get_campaign = async (

    request,
    response

) => {

    try {

        const { campaign_id } = request.params;

        const campaign = await get_campaign_by_id(campaign_id);

        if (!campaign) {

            return response.status(404).json({

                success: false,

                message: "Campaign not found."

            });

        }

        return response.status(200).json({

            success: true,

            data: { campaign }

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
 * add_campaign()
 * --------------
 * Creates a new affiliate campaign.
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

export const add_campaign = async (

    request,
    response

) => {

    try {

        const validated_body =
            create_campaign_schema.parse(request.body);

        const new_campaign = await create_campaign(

            validated_body,

            request.admin.admin_id

        );

        return response.status(201).json({

            success: true,

            data: { campaign: new_campaign }

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

        return response.status(500).json({

            success: false,

            message: error.message

        });

    }

};



/**
 * edit_campaign()
 * ---------------
 * Partially updates an existing campaign.
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

export const edit_campaign = async (

    request,
    response

) => {

    try {

        const { campaign_id } = request.params;

        const validated_body =
            update_campaign_schema.parse(request.body);

        const existing_campaign =
            await get_campaign_by_id(campaign_id);

        if (!existing_campaign) {

            return response.status(404).json({

                success: false,

                message: "Campaign not found."

            });

        }

        const updated_campaign = await update_campaign(

            campaign_id,

            validated_body,

            request.admin.admin_id

        );

        return response.status(200).json({

            success: true,

            data: { campaign: updated_campaign }

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

        return response.status(500).json({

            success: false,

            message: error.message

        });

    }

};



/**
 * toggle_campaign()
 * -----------------
 * Flips the active/inactive status of a campaign.
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

export const toggle_campaign = async (

    request,
    response

) => {

    try {

        const { campaign_id } = request.params;

        const updated_campaign = await toggle_campaign_status(

            campaign_id,

            request.admin.admin_id

        );

        if (!updated_campaign) {

            return response.status(404).json({

                success: false,

                message: "Campaign not found."

            });

        }

        return response.status(200).json({

            success: true,

            data: { campaign: updated_campaign }

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
 * remove_campaign()
 * -----------------
 * Permanently deletes a campaign with no submissions.
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

export const remove_campaign = async (

    request,
    response

) => {

    try {

        const { campaign_id } = request.params;

        const existing_campaign =
            await get_campaign_by_id(campaign_id);

        if (!existing_campaign) {

            return response.status(404).json({

                success: false,

                message: "Campaign not found."

            });

        }

        await delete_campaign(

            campaign_id,

            request.admin.admin_id

        );

        return response.status(200).json({

            success: true,

            message: "Campaign deleted."

        });

    }

    catch (error) {

        return response.status(500).json({

            success: false,

            message: error.message

        });

    }

};
