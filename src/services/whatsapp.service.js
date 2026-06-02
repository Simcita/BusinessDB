import axios from "axios";

import logger from "../utils/logger.js";



/**
 * send_whatsapp_message()
 * -----------------------
 * Sends WhatsApp template message
 * using Meta Cloud API.
 *
 * Parameters:
 * -----------
 * phone_number : string
 *
 * customer_name : string
 *
 * xm_account_id : string
 *
 * Returns:
 * --------
 * Promise<object>
 */

export const send_whatsapp_message = async (

    phone_number,
    customer_name,
    xm_account_id

) => {

    try {

        const response = await axios.post(

            `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,

            {

                messaging_product: "whatsapp",

                to: phone_number,

                type: "template",

                template: {

                    name: process.env.WHATSAPP_TEMPLATE_NAME,

                    language: {

                        code: "en"

                    },

                    components: [

                        {

                            type: "body",

                            parameters: [

                                {

                                    type: "text",

                                    text: customer_name

                                },

                                {

                                    type: "text",

                                    text: xm_account_id

                                }

                            ]

                        }

                    ]

                }

            },

            {

                headers: {

                    Authorization:

                        `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,

                    "Content-Type": "application/json"

                }

            }

        );



        logger.info(

            `WhatsApp sent to ${phone_number}`

        );



        return {

            success: true,

            response: response.data

        };

    }

    catch (error) {

        logger.error(

            error.message

        );



        return {

            success: false,

            response: error.message

        };

    }

};
