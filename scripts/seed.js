import prisma from "../src/config/database.js";

import { hash_password } from "../src/utils/password.js";



// ============================================================
// SEED DATA CONSTANTS
// ============================================================
// All default values are defined here as named constants so
// they are easy to locate, update, and review.
// ============================================================

const DEFAULT_ADMIN_EMAIL    = "admin@sharesworldwide.trade";
const DEFAULT_ADMIN_PASSWORD = "ChangeMe123!";
const DEFAULT_ADMIN_NAME     = "System Administrator";

const DEFAULT_CAMPAIGN_NAME  = "XM Default Campaign";
const DEFAULT_BROKER_NAME    = "XM Global";
const DEFAULT_WHOP_LINK      = process.env.WHOP_LINK || "https://whop.com/replace-me";

const WHATSAPP_TEMPLATE_NAME = "XM Verification — WhatsApp";
const EMAIL_TEMPLATE_NAME    = "XM Verification — Email";



// ============================================================
// HELPERS
// ============================================================

/**
 * log_seed_result()
 * -----------------
 * Prints a seed operation result to the console.
 *
 * Parameters:
 * -----------
 * label  : string  — human-readable entity label
 * action : string  — "created" | "already exists"
 * value  : string  — identifying value (e.g. email)
 *
 * Returns:
 * --------
 * void
 */

const log_seed_result = (label, action, value) => {
    const icon = action === "created" ? "✔" : "–";
    console.log(`  ${icon}  ${label}: ${action} (${value})`);
};



// ============================================================
// SEEDERS
// ============================================================

/**
 * seed_super_admin()
 * ------------------
 * Creates the initial SUPER_ADMIN account if one does not
 * already exist. Uses upsert to remain idempotent.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * Promise<void>
 */

const seed_super_admin = async () => {

    const existing_admin = await prisma.adminUser.findUnique({
        where: { email: DEFAULT_ADMIN_EMAIL }
    });

    if (existing_admin) {
        log_seed_result("SUPER_ADMIN", "already exists", DEFAULT_ADMIN_EMAIL);
        return;
    }

    const password_hash = await hash_password(DEFAULT_ADMIN_PASSWORD);

    await prisma.adminUser.create({
        data: {
            fullName:     DEFAULT_ADMIN_NAME,
            email:        DEFAULT_ADMIN_EMAIL,
            passwordHash: password_hash,
            role:         "SUPER_ADMIN"
        }
    });

    log_seed_result("SUPER_ADMIN", "created", DEFAULT_ADMIN_EMAIL);

};



/**
 * seed_default_campaign()
 * -----------------------
 * Creates the default affiliate campaign if none exists.
 * This campaign is used when a submission arrives without
 * an explicit campaignId.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * Promise<void>
 */

const seed_default_campaign = async () => {

    const existing_campaign = await prisma.campaign.findUnique({
        where: { campaignName: DEFAULT_CAMPAIGN_NAME }
    });

    if (existing_campaign) {
        log_seed_result("Campaign", "already exists", DEFAULT_CAMPAIGN_NAME);
        return;
    }

    await prisma.campaign.create({
        data: {
            campaignName: DEFAULT_CAMPAIGN_NAME,
            brokerName:   DEFAULT_BROKER_NAME,
            whopLink:     DEFAULT_WHOP_LINK,
            isActive:     true
        }
    });

    log_seed_result("Campaign", "created", DEFAULT_CAMPAIGN_NAME);

};



/**
 * seed_notification_templates()
 * ------------------------------
 * Creates default WhatsApp and Email notification templates
 * if they do not already exist.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * Promise<void>
 */

const seed_notification_templates = async () => {

    // --------------------------------------------------------
    // Default WhatsApp template
    // --------------------------------------------------------
    // The body mirrors the structure expected by the Meta
    // WhatsApp Cloud API template component parameters.
    // Replace {{1}} and {{2}} with the customer name and
    // XM account ID respectively at send time.
    // --------------------------------------------------------

    const existing_whatsapp_template =
        await prisma.notificationTemplate.findUnique({
            where: { templateName: WHATSAPP_TEMPLATE_NAME }
        });

    if (existing_whatsapp_template) {

        log_seed_result(
            "NotificationTemplate (WhatsApp)",
            "already exists",
            WHATSAPP_TEMPLATE_NAME
        );

    } else {

        await prisma.notificationTemplate.create({
            data: {
                templateName:     WHATSAPP_TEMPLATE_NAME,
                notificationType: "WHATSAPP",
                subjectLine:      null,
                templateBody:
                    "Hello {{1}}, your XM Account ID {{2}} has been verified. " +
                    "Access your community here: {{3}}",
                isActive:         true
            }
        });

        log_seed_result(
            "NotificationTemplate (WhatsApp)",
            "created",
            WHATSAPP_TEMPLATE_NAME
        );

    }


    // --------------------------------------------------------
    // Default Email template
    // --------------------------------------------------------

    const existing_email_template =
        await prisma.notificationTemplate.findUnique({
            where: { templateName: EMAIL_TEMPLATE_NAME }
        });

    if (existing_email_template) {

        log_seed_result(
            "NotificationTemplate (Email)",
            "already exists",
            EMAIL_TEMPLATE_NAME
        );

    } else {

        await prisma.notificationTemplate.create({
            data: {
                templateName:     EMAIL_TEMPLATE_NAME,
                notificationType: "EMAIL",
                subjectLine:      "Your XM Verification Was Successful",
                templateBody:
                    "<p>Hello {{name}},</p>" +
                    "<p>Your XM Account ID <strong>{{xmAccountId}}</strong> " +
                    "has been verified successfully.</p>" +
                    "<p><a href='{{whopLink}}'>Access Your Community</a></p>",
                isActive:         true
            }
        });

        log_seed_result(
            "NotificationTemplate (Email)",
            "created",
            EMAIL_TEMPLATE_NAME
        );

    }

};



// ============================================================
// ENTRY POINT
// ============================================================

/**
 * run_seed()
 * ----------
 * Orchestrates all seed operations in dependency order.
 * Idempotent — safe to run multiple times without side effects.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * Promise<void>
 */

const run_seed = async () => {

    console.log("\n  sharesworldwide.trade — Database Seed\n");

    try {

        await seed_super_admin();

        await seed_default_campaign();

        await seed_notification_templates();

        console.log("\n  Seed complete.\n");

    }

    catch (error) {

        console.error("\n  Seed failed:", error.message, "\n");

        process.exit(1);

    }

    finally {

        await prisma.$disconnect();

    }

};



run_seed();
