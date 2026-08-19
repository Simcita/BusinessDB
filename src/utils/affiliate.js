/**
 * get_affiliate_info()
 * ---------------------
 * Central lookup for the two partner codes and the shared
 * registration link. BANDISHARES05 is the general public
 * signup code; UNITOUR is used only on tour-specific surfaces
 * (Livestream Waitlist, Door Check).
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * { general_code: string, tour_code: string, link: string }
 */

export const get_affiliate_info = () => ({

    general_code: process.env.AFFILIATE_CODE || "BANDISHARES05",

    tour_code: process.env.TOUR_AFFILIATE_CODE || "UNITOUR",

    link: process.env.AFFILIATE_LINK || "https://clicks.pipaffiliates.com/c?c=1264888&l=en&p=1"

});



/**
 * build_general_registration_prompt()
 * --------------------------------------
 * Used by /api/verify-xm's PENDING_SIGNUP response — the
 * general public signup flow. Shows BANDISHARES05, not UNITOUR.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * string
 */

export const build_general_registration_prompt = () => {

    const { general_code, link } = get_affiliate_info();

    return `open a new XM account using referral code ${general_code}: ${link}`;

};



/**
 * build_waitlist_not_found_message()
 * --------------------------------------
 * Used by the Livestream Waitlist signup 404 — exact wording
 * as specified, shows UNITOUR only. Only the link is
 * interpolated so it stays correct if it ever changes.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * string
 */

export const build_waitlist_not_found_message = () => {

    const { tour_code, link } = get_affiliate_info();

    return `Your MT ID does not appear within our database. Please open an additional live account use partner code ${tour_code}\n\nIf you dont have an account. Here is the link, use the partner code above\n\nLink: ${link}`;

};
