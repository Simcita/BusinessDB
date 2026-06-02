/**
 * extract_xm_account_id()
 * -----------------------
 * Extracts XM account ID from
 * email text content using RegEx.
 *
 * Parameters:
 * -----------
 * email_text : string
 *      Raw email body text.
 *
 * Returns:
 * --------
 * string | null
 *      Extracted XM account ID.
 */

export const extract_xm_account_id = (

    email_text

) => {

    /**
     * XM account ID matching patterns.
     */

    const patterns = [

        /XM Account ID[:\s]+(\d+)/i,

        /account id[:\s]+(\d+)/i,

        /\b\d{7,10}\b/

    ];



    /**
     * Iterate through patterns.
     */

    for (const pattern of patterns) {

        const match = email_text.match(pattern);



        if (match) {

            return match[1] || match[0];

        }

    }



    return null;

};
