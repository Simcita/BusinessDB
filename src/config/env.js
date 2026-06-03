import dotenv from "dotenv";

dotenv.config();



/**
 * required_environment_variables
 * ------------------------------
 * List of mandatory environment variables.
 */

const required_environment_variables = [

    "DATABASE_URL",

    "JWT_SECRET",

    //  "WHATSAPP_ACCESS_TOKEN",

    //  "WHATSAPP_PHONE_NUMBER_ID",

    //  "WHATSAPP_TEMPLATE_NAME",

    "RESEND_API_KEY",

    "EMAIL_FROM",

    "IMAP_HOST",

    "IMAP_PORT",

    "IMAP_USER",

    "IMAP_PASS",

    //  "AFFILIATE_LINK"

];



/**
 * validate_environment()
 * ----------------------
 * Validates all required environment variables.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */

const validate_environment = () => {

    const missing_variables = [];



    /**
     * Check missing variables.
     */

    for (

        const variable_name

        of required_environment_variables

    ) {

        if (!process.env[variable_name]) {

            missing_variables.push(variable_name);

        }

    }



    /**
     * Stop application if invalid.
     */

    if (missing_variables.length > 0) {

        throw new Error(

            `Missing environment variables: ${missing_variables.join(", ")}`

        );

    }

};



validate_environment();
