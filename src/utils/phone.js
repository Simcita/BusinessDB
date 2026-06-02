import {
    parsePhoneNumberFromString
} from "libphonenumber-js";



/**
 * format_phone_number()
 * ---------------------
 * Converts phone number into
 * E.164 international format.
 *
 * Parameters:
 * -----------
 * phone_number : string
 *
 * Returns:
 * --------
 * string
 */

export const format_phone_number = (

    phone_number

) => {

    const parsed_phone =

        parsePhoneNumberFromString(

            phone_number,

            "ZA"

        );



    /**
     * Return original number
     * if parsing fails.
     */

    if (!parsed_phone) {

        return phone_number;

    }



    return parsed_phone.number;

};
