import { Resend } from "resend";

import logger from "../utils/logger.js";



/**
 * resend
 * ------
 * Resend email client instance.
 */

const resend = new Resend(

    process.env.RESEND_API_KEY

);



/**
 * send_verification_email()
 * -------------------------
 * Sends the community welcome email once an XM account
 * is verified. Includes both Whop options, setup instructions,
 * and support contact details.
 *
 * Parameters:
 * -----------
 * recipient_email : string
 * customer_name   : string
 * xm_account_id  : string
 * whop_link       : string  — unused directly; kept for backward compat
 *
 * Returns:
 * --------
 * Promise<{ success: boolean, response: object | string }>
 */

export const send_verification_email = async (

    recipient_email,
    customer_name,
    xm_account_id

) => {

    const bootcamp_link    = process.env.WHOP_BOOTCAMP_LINK   || "https://whop.com/bandi-shares-educational-program/bootacamp/";
    const discussion_link  = process.env.WHOP_DISCUSSION_LINK || "https://whop.com/bandi-shares-educational-program/trade-discussion-xm-copy/";
    const video_link       = process.env.VIDEO_LINK            || null;

    const btn = (href, label, recommended = false) => `
        <a href="${href}" target="_blank" style="
            display: block;
            background-color: ${recommended ? '#10b981' : '#1a1a2e'};
            color: #ffffff;
            padding: 14px 24px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 700;
            font-size: 15px;
            text-align: center;
            margin-top: 12px;
            border: ${recommended ? 'none' : '1px solid #333'};
        ">${label}</a>
    `;

    try {

        const { data, error } = await resend.emails.send({

            from: process.env.EMAIL_FROM,

            to: recipient_email,

            subject: "Welcome to the Bandi Shares Trade Discussion Community 📊",

            html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

  <div style="max-width:620px;margin:0 auto;background-color:#111118;border-radius:12px;overflow:hidden;margin-top:24px;margin-bottom:24px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0d1f1a 0%,#0a2918 100%);padding:32px 40px;border-bottom:1px solid #1a3326;">
      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#10b981;">Bandi Shares · The Economist</p>
      <h1 style="margin:8px 0 0;font-size:24px;color:#ffffff;font-weight:800;line-height:1.3;">
        Welcome to the Trade<br/>Discussion Community 📊
      </h1>
    </div>

    <!-- Body -->
    <div style="padding:32px 40px;">

      <p style="color:#d1d5db;font-size:16px;margin:0 0 8px;">Hello <strong style="color:#ffffff;">${customer_name}</strong>,</p>
      <p style="color:#9ca3af;font-size:14px;margin:0 0 28px;">
        Your XM Account <strong style="color:#10b981;">${xm_account_id}</strong> has been verified.
        Your access starts now.
      </p>

      <p style="color:#d1d5db;font-size:15px;margin:0 0 24px;">
        We currently offer <strong style="color:#ffffff;">2 options</strong>, and it's important to understand the difference clearly.
      </p>

      <!-- Option 1 -->
      <div style="background:#0d1f1a;border:1px solid #1a3326;border-radius:10px;padding:24px;margin-bottom:20px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:#10b981;">Option 1 — Recommended</p>
        <h2 style="margin:4px 0 16px;font-size:18px;color:#ffffff;font-weight:700;">
          1️⃣ Trade Discussion + Fundamental Education
        </h2>
        <p style="color:#9ca3af;font-size:14px;margin:0 0 12px;">This option includes:</p>
        <ul style="margin:0 0 16px;padding-left:20px;color:#d1d5db;font-size:14px;line-height:1.8;">
          <li>Full Discord Access</li>
          <li>7-Day Fundamentals Bootcamp Videos</li>
          <li>Fundamentals Notes</li>
          <li>Lifetime access to the educational material</li>
        </ul>
        <div style="background:#0a1510;border-left:3px solid #10b981;padding:12px 16px;border-radius:4px;margin-bottom:12px;">
          <p style="margin:0;color:#d1d5db;font-size:13px;line-height:1.6;">
            📌 The first <strong style="color:#ffffff;">30 days inside the Discord are FREE.</strong><br/>
            The once-off payment of <strong style="color:#ffffff;">R1540 ($95)</strong> is NOT for Discord access — it is purely for the education itself.<br/>
            After 30 days, Discord continues at <strong style="color:#ffffff;">R650/month</strong>, billed automatically. Cancel anytime.
          </p>
        </div>
        ${btn(bootcamp_link, "Join — Trade Discussion + Education →", true)}
        <div style="background:#0a1510;border-left:3px solid #10b981;padding:12px 16px;border-radius:4px;margin-top:16px;">
          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.7;">
            📌 <strong style="color:#ffffff;">I strongly recommend this option.</strong><br/>
            The Discord discussions are heavily based on macroeconomics, fundamentals, sentiment, geopolitics,
            central banks, yields, inflation expectations, and institutional market reactions.<br/><br/>
            Without the educational background, some traders may find it difficult to fully understand
            why markets are moving the way they are.<br/><br/>
            The education helps you build the foundation first, so when you enter the live discussions,
            updates, and trading sessions, everything starts making much more sense.<br/><br/>
            You stop just copying ideas and begin understanding the actual reasons behind market movement.<br/>
            <strong style="color:#ffffff;">That is where real confidence and long-term consistency begin.</strong>
          </p>
        </div>
      </div>

      <!-- Option 2 -->
      <div style="background:#13131d;border:1px solid #252535;border-radius:10px;padding:24px;margin-bottom:28px;">
        <h2 style="margin:0 0 16px;font-size:18px;color:#ffffff;font-weight:700;">
          2️⃣ Trade Discussion Only
        </h2>
        <p style="color:#9ca3af;font-size:14px;margin:0 0 12px;">This option gives you:</p>
        <ul style="margin:0 0 16px;padding-left:20px;color:#d1d5db;font-size:14px;line-height:1.8;">
          <li>Discord Access Only</li>
          <li>No educational material included</li>
        </ul>
        <div style="background:#0d0d17;border-left:3px solid #6366f1;padding:12px 16px;border-radius:4px;margin-bottom:12px;">
          <p style="margin:0;color:#d1d5db;font-size:13px;line-height:1.6;">
            📌 The first <strong style="color:#ffffff;">30 days are also completely FREE.</strong><br/>
            After 30 days, membership continues at <strong style="color:#ffffff;">R650/month</strong>, billed automatically. Cancel anytime.
          </p>
        </div>
        ${btn(discussion_link, "Join — Trade Discussion Only →")}
        <p style="color:#6b7280;font-size:13px;margin-top:16px;line-height:1.7;">
          This option is generally better suited for traders who already have a solid understanding
          of fundamentals and macroeconomics.
        </p>
      </div>

      <!-- Closing note to options -->
      <div style="background:#13131d;border:1px solid #252535;border-radius:10px;padding:20px 24px;margin-bottom:28px;text-align:center;">
        <p style="color:#9ca3af;font-size:13px;line-height:1.8;margin:0 0 8px;">
          Use this opportunity to fully engage, learn, and participate in the live sessions.<br/>
          Trade with discipline. Risk small. Do not rush the process. Focus on consistency over hype.
        </p>
        <p style="color:#d1d5db;font-size:14px;font-weight:600;margin:0;">
          The goal is not just to trade.<br/>
          The goal is to understand the market deeply enough to survive it long term.
        </p>
        <p style="color:#10b981;font-size:14px;font-weight:700;margin:12px 0 0;">Let's work. 💪</p>
      </div>

      <!-- Divider -->
      <hr style="border:none;border-top:1px solid #1e1e2e;margin:0 0 28px;" />

      <!-- Setup instructions -->
      <h3 style="color:#ffffff;font-size:16px;font-weight:700;margin:0 0 12px;">📋 Getting Started</h3>
      <p style="color:#9ca3af;font-size:14px;line-height:1.7;margin:0 0 16px;">
        Detailed step-by-step instructions on what to do after clicking either of the links above —
        how Whop works, how to access the Discord community, and how to connect your Whop account
        to Discord successfully.
      </p>

      ${video_link
        ? btn(video_link, "▶ Watch the Setup Guide →", false)
        : `<div style="background:#1a1a2e;border:1px dashed #333;border-radius:8px;padding:16px;text-align:center;">
             <p style="color:#6b7280;font-size:13px;margin:0;">📹 Setup video coming soon — we'll update you when it's live.</p>
           </div>`
      }

      <!-- Important note -->
      <div style="background:#1a1008;border:1px solid #3d2c00;border-radius:10px;padding:20px 24px;margin-top:24px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#f59e0b;">📌 Important</p>
        <p style="color:#d1d5db;font-size:13px;line-height:1.7;margin:0 0 12px;">
          Please make sure your <strong style="color:#ffffff;">Whop account and Discord account use the same email address</strong>
          to make the access process smooth and automatic.
        </p>
        <p style="color:#9ca3af;font-size:13px;line-height:1.7;margin:0 0 12px;">
          Note: Whop is the one that adds and removes you from Discord — not me. To remain in the
          programme 30 days from now, make sure your affairs with Whop are in order.
        </p>
        <p style="color:#9ca3af;font-size:13px;line-height:1.7;margin:0;">
          Should you face any issues with Whop or Discord, I am not the person to contact.
          <strong style="color:#ffffff;">Ntokozo</strong> is here to help — <strong style="color:#f59e0b;">+27 74 973 3360</strong>.<br/>
          If you message me about those troubles, you will be wasting your time as I cannot help.
        </p>
      </div>

    </div>

    <!-- Footer -->
    <div style="background:#0a0a0a;padding:20px 40px;border-top:1px solid #1e1e2e;text-align:center;">
      <p style="margin:0 0 4px;color:#ffffff;font-size:14px;font-weight:700;">Yours Truly,</p>
      <p style="margin:0;color:#10b981;font-size:14px;font-weight:700;">General Shares</p>
      <p style="margin:12px 0 0;color:#4b5563;font-size:11px;">sharesworldwide.trade</p>
    </div>

  </div>

</body>
</html>
            `

        });



        if (error) {

            logger.error(

                `Email delivery failed for ${recipient_email}: ${error.message}`

            );

            return {

                success: false,

                response: error.message

            };

        }



        logger.info(

            `Verification email sent to ${recipient_email}`

        );



        return {

            success: true,

            response: data

        };

    }

    catch (error) {

        logger.error(

            `Email delivery failed for ${recipient_email}: ${error.message}`

        );



        return {

            success: false,

            response: error.message

        };

    }

};



/**
 * send_batch_emails()
 * --------------------
 * Sends up to 100 independent emails in a single Resend batch
 * API call, using batchValidation:"permissive" so a single
 * malformed recipient doesn't fail the whole call — Resend
 * returns per-recipient errors (with their original array
 * index) alongside the successfully-sent ids.
 *
 * Parameters:
 * -----------
 * emails : Array<{ to: string[], subject: string, html: string }>
 *          — max 100 entries per call (Resend's batch limit)
 *
 * idempotency_key : string  — optional, prevents duplicate sends on retry
 *                    (Resend's format: "batch-<event-type>/<id>")
 *
 * Returns:
 * --------
 * Promise<{ success: boolean, errors?: Array<{index,message}>, response?: string, error_name?: string }>
 * error_name is Resend's own error code (e.g. "rate_limit_exceeded") — callers
 * use this to decide whether a failure is worth retrying.
 */

export const send_batch_emails = async (emails, idempotency_key) => {

    try {

        const { data, error } = await resend.batch.send(emails, {

            batchValidation: "permissive",

            idempotencyKey: idempotency_key

        });

        if (error) {

            logger.error(

                `Batch email delivery failed: ${error.message}`

            );

            return {

                success: false,

                response: error.message,

                error_name: error.name || null

            };

        }

        return {

            success: true,

            errors: data.errors || []

        };

    }

    catch (error) {

        logger.error(

            `Batch email delivery failed: ${error.message}`

        );

        return {

            success: false,

            response: error.message,

            error_name: null

        };

    }

};



/**
 * send_custom_email()
 * ---------------------
 * Sends a single ad-hoc email — used by the admin Email Center
 * (manual sends) and anywhere a caller has already built the
 * subject/HTML itself. Reuses the same module-level Resend
 * client as send_verification_email.
 *
 * Parameters:
 * -----------
 * recipient_email : string
 * subject         : string
 * html            : string
 *
 * Returns:
 * --------
 * Promise<{ success: boolean, response: object | string }>
 */

export const send_custom_email = async (recipient_email, subject, html) => {

    try {

        const { data, error } = await resend.emails.send({

            from: process.env.EMAIL_FROM,

            to: recipient_email,

            subject,

            html

        });

        if (error) {

            logger.error(

                `Custom email delivery failed for ${recipient_email}: ${error.message}`

            );

            return {

                success: false,

                response: error.message

            };

        }

        return {

            success: true,

            response: data

        };

    }

    catch (error) {

        logger.error(

            `Custom email delivery failed for ${recipient_email}: ${error.message}`

        );

        return {

            success: false,

            response: error.message

        };

    }

};
