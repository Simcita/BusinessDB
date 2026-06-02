import {

    verify_xm_account,

    check_duplicate_submission,

    create_submission

} from "../services/verification.service.js";



import {

    verify_xm_schema

} from "../utils/validation.js";



import {

    format_phone_number

} from "../utils/phone.js";

import {

    create_fulfillment_jobs

} from "../services/fullfilment.service.js";



/**
 * verify_xm_submission()
 * ----------------------
 * Handles XM verification form submission.
 *
 * Parameters:
 * -----------
 * request : Express Request Object
 *
 * response : Express Response Object
 *
 * Returns:
 * --------
 * JSON Response
 */

export const verify_xm_submission = async (

    request,
    response

) => {

    try {

        /**
         * Validate request body.
         */

        const validated_data =

            verify_xm_schema.parse(

                request.body

            );



        /**
         * Normalize phone number.
         */

        const formatted_phone =

            format_phone_number(

                validated_data.phone

            );



        /**
         * Check XM account existence.
         */

        const xm_exists =

            await verify_xm_account(

                validated_data.xm_account_id

            );



        /**
         * Reject invalid XM accounts.
         */

        if (!xm_exists) {

            return response.status(404).json({

                success: false,

                message: "XM account not found."

            });

        }



        /**
         * Prevent duplicate claims.
         */

        const is_duplicate =

            await check_duplicate_submission(

                validated_data.xm_account_id

            );



        if (is_duplicate) {

            return response.status(409).json({

                success: false,

                message: "XM account already claimed."

            });

        }



        /**
         * Create verified submission.
         */

        const submission =

            await create_submission({

                name: validated_data.name,

                surname: validated_data.surname,

                email: validated_data.email,

                phone: formatted_phone,

                xmAccountId:

                    validated_data.xm_account_id,

                status: "VERIFIED",

                ipAddress: request.ip,

                fulfilledAt: new Date()

            });

        /**
         * Create fulfillment jobs.
         */

        await create_fulfillment_jobs(

            submission.id

        );





        return response.status(200).json({

            success: true,

            message: "XM account verified.",

            submission

        });

    }

    catch (error) {

        return response.status(500).json({

            success: false,

            message: error.message

        });

    }

};