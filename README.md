# sharesworldwide.trade — Backend System

Production-ready automation platform for sharesworldwide.trade. Handles affiliate account verification, automated fulfillment delivery (WhatsApp + Email), background email parsing, and a complete admin API for the management dashboard.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Architecture](#architecture)
3. [Project Structure](#project-structure)
4. [Getting Started](#getting-started)
5. [Available Scripts](#available-scripts)
6. [Environment Variables](#environment-variables)
7. [API Reference](#api-reference)
8. [Background Workers](#background-workers)
9. [Roles & Permissions](#roles--permissions)
10. [Database — Enums](#database--enums)
11. [Database — Models](#database--models)
12. [Database — Relationships](#database--relationships)
13. [Database — Indexes](#database--indexes)
14. [Migrations](#migrations)
15. [Seed Strategy](#seed-strategy)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (ESM) |
| Framework | Express 5 |
| Database | PostgreSQL via Supabase |
| ORM | Prisma 7 + `@prisma/adapter-pg` |
| Authentication | JWT in HttpOnly cookie + bcrypt |
| Email parsing | ImapFlow + mailparser |
| Email delivery | Resend |
| WhatsApp delivery | Meta WhatsApp Cloud API |
| Task scheduling | node-cron |
| Validation | Zod 4 |
| Logging | Winston |

---

## Architecture

```
Next.js Dashboard
      ↓
Express API  (src/)
      ↓
Prisma ORM
      ↓
Supabase PostgreSQL

Background Workers (run independently of API routes):
  Gmail Worker       — IMAP polling, affiliate email parsing
  Fulfillment Worker — notification delivery queue
  Metrics Worker     — periodic system snapshots
```

**Strict layering rules:**
- Frontend never accesses the database directly.
- Controllers only validate, call a service, and return a response.
- All business logic lives in services.
- Workers only orchestrate services — no direct DB access.
- Database access belongs exclusively in services via Prisma.

---

## Project Structure

```
prisma/
  schema.prisma                      # Complete database schema (source of truth)
  migrations/
    20260531193737_init/             # Initial tables: submissions, fulfillment_logs, accounts
    20260531230033_architecture_upgrade/  # Campaigns, jobs, templates, audit_logs, parser_logs
    20260531231308_observability_layer/   # Admin users, failed_jobs, system_metrics
    20260602000000_production_hardening/  # Indexes, updatedAt, soft-delete, ParsingStatus enum

scripts/
  seed.js                            # Full idempotent platform seed (admin + campaign + templates)
  seed-admin.js                      # Legacy — superseded by seed.js

src/
  config/
    database.js                      # Prisma singleton client
    env.js                           # Required env var validation at startup

  controllers/
    admin-auth.controller.js         # Login / logout
    admin.controller.js              # Dashboard metrics, submissions, jobs, logs
    campaign.controller.js           # Campaign CRUD
    health.controller.js             # Liveness check
    template.controller.js           # Notification template CRUD
    verification.controller.js       # XM account verification form

  middleware/
    auth.middleware.js               # JWT from HttpOnly cookie or Bearer header
    error.middleware.js              # Global error handler (always registered last)
    rate-limit.middleware.js         # 100 req / 15 min on public API routes
    role.middleware.js               # Role-based access control (SUPPORT / ADMIN / SUPER_ADMIN)

  routes/
    admin-auth.routes.js             # POST /admin/auth/login, POST /admin/auth/logout
    admin.routes.js                  # Protected admin dashboard endpoints
    campaign.routes.js               # Protected campaign CRUD
    health.routes.js                 # GET /health
    template.routes.js               # Protected template CRUD
    verification.routes.js           # POST /api/verify-xm (public)

  services/
    admin-auth.service.js            # Credential verification + last-login timestamp
    admin.service.js                 # Paginated dashboard queries for all list pages
    audit.service.js                 # Append-only audit log writer
    campaign.service.js              # Campaign CRUD + audit logging
    email.service.js                 # Resend email delivery
    fullfilment.service.js           # Creates WHATSAPP + EMAIL fulfillment jobs
    gmail.service.js                 # IMAP connection, email download, account ID extraction
    metrics.service.js               # Aggregates counts into SystemMetric snapshot
    retry.service.js                 # Moves exhausted jobs to dead-letter queue
    template.service.js              # Template CRUD + audit logging
    verification.service.js          # XM account lookup + duplicate check + submission creation
    whatsapp.service.js              # Meta WhatsApp Cloud API delivery

  utils/
    jwt.js                           # Token generation
    logger.js                        # Winston logger (console + file)
    password.js                      # bcrypt hash + compare
    phone.js                         # libphonenumber-js E.164 normalisation
    response.js                      # Standardised success / error response helpers
    validation.js                    # Zod schema for the public verify-xm endpoint
    xm.parser.js                     # RegEx patterns for extracting account IDs from email text

  validators/
    admin.validators.js              # Zod schemas for all admin endpoints

  workers/
    fulfillment.worker.js            # Cron: every 15 min (POLL_CRON_SCHEDULE, disable: DISABLE_JOB_PROCESSING)
    gmail.worker.js                  # Cron: every 15 min (POLL_CRON_SCHEDULE, disable: DISABLE_EMAIL_POLLING)
    metrics.worker.js                # Cron: every 15 minutes

  app.js                             # Express app — middleware stack and route mounting
  server.js                          # Entry point — starts HTTP server then workers
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 22.12.0 (required by Prisma v7 and modern ESM package compatibility)
- Supabase project (PostgreSQL)
- Resend account + verified sender domain
- Meta WhatsApp Business account *(optional — leave tokens blank to skip WhatsApp delivery)*
- IMAP-enabled email inbox for affiliate email parsing

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the template below into a `.env` file at the project root.

```env
# ─── Application ───────────────────────────────────────────
PORT=5000
NODE_ENV=development

# ─── Supabase ──────────────────────────────────────────────
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-1-eu-central-1.pooler.supabase.com:5432/postgres

# ─── JWT ───────────────────────────────────────────────────
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=<64-byte random hex string>

# ─── IMAP (affiliate email inbox) ─────────────────────────
IMAP_HOST=mail.privateemail.com
IMAP_PORT=993
IMAP_USER=affiliates@yourdomain.com
IMAP_PASS=yourpassword

# ─── WhatsApp Cloud API ────────────────────────────────────
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_TEMPLATE_NAME=xm_verification_success

# ─── Resend ────────────────────────────────────────────────
RESEND_API_KEY=re_...
EMAIL_FROM=affiliate@yourdomain.com

# ─── Frontend ──────────────────────────────────────────────
FRONTEND_URL=https://yourdomain.com

# ─── Default Whop community link ──────────────────────────
# Overridden per campaign — this is the fallback only
WHOP_LINK=https://whop.com/your-link

# ─── Supabase direct connection (for migrations) ──────────
# Use the direct (non-pooled) connection string for Prisma migrations
DIRECT_URL=postgresql://postgres.<ref>:<password>@db.<ref>.supabase.co:5432/postgres

# ─── Whop product links (sent in welcome email) ───────────
WHOP_BOOTCAMP_LINK=https://whop.com/your-bootcamp
WHOP_DISCUSSION_LINK=https://whop.com/your-discussions

# ─── Affiliate config ─────────────────────────────────────
AFFILIATE_CODE=your_affiliate_code
AFFILIATE_LINK=https://partners.etoro.com/your_link

# ─── Community video (sent in welcome email) ──────────────
VIDEO_LINK=https://youtu.be/your_video_id

# ─── Worker toggles (set to "true" to disable) ────────────
DISABLE_EMAIL_POLLING=false
DISABLE_JOB_PROCESSING=false

# ─── Cron schedule override (optional) ────────────────────
# Default: */15 * * * * (every 15 minutes)
POLL_CRON_SCHEDULE=*/15 * * * *
```

### 3. Apply migrations

```bash
npm run db:generate   # Generate Prisma client from schema
npm run db:migrate    # Apply all pending migrations to the database
```

### 4. Seed reference data

```bash
npm run seed
```

Creates the first SUPER_ADMIN account, a default campaign, and default notification templates.
**Change the admin password immediately after first login.**

Default credentials: `admin@sharesworldwide.trade` / `ChangeMe123!`

### 5. Start the server

```bash
npm run dev     # Development (nodemon with hot reload)
npm start       # Production
```

---

## Available Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `nodemon src/server.js` | Development server with hot reload |
| `start` | `node src/server.js` | Production server |
| `seed` | `node scripts/seed.js` | Idempotent full-platform seed |
| `db:generate` | `prisma generate` | Regenerate Prisma client after schema changes |
| `db:migrate` | `prisma migrate deploy` | Apply pending migrations |
| `db:studio` | `prisma studio` | Open Prisma Studio database browser |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | HTTP server port. Default `5000` |
| `NODE_ENV` | No | `development` or `production`. Controls cookie `secure` flag |
| `DATABASE_URL` | **Yes** | Supabase PostgreSQL connection string |
| `JWT_SECRET` | **Yes** | 64-byte hex secret for signing admin JWTs |
| `IMAP_HOST` | **Yes** | IMAP server hostname |
| `IMAP_PORT` | **Yes** | IMAP server port (typically `993`) |
| `IMAP_USER` | **Yes** | IMAP account email address |
| `IMAP_PASS` | **Yes** | IMAP account password |
| `RESEND_API_KEY` | **Yes** | Resend API key for email delivery |
| `EMAIL_FROM` | **Yes** | Verified sender address for Resend |
| `WHATSAPP_ACCESS_TOKEN` | No | Meta WhatsApp Cloud API bearer token |
| `WHATSAPP_PHONE_NUMBER_ID` | No | Meta phone number ID for sending messages |
| `WHATSAPP_TEMPLATE_NAME` | No | Approved Meta template name. Default `xm_verification_success` |
| `FRONTEND_URL` | No | Dashboard origin for CORS allow-list |
| `WHOP_LINK` | No | Fallback Whop community link (overridden per campaign) |
| `DIRECT_URL` | No | Direct (non-pooled) Supabase URL — used by `prisma migrate deploy` |
| `WHOP_BOOTCAMP_LINK` | No | Whop bootcamp product link included in welcome email |
| `WHOP_DISCUSSION_LINK` | No | Whop discussion-only product link included in welcome email |
| `AFFILIATE_CODE` | No | Affiliate/referral code returned on account-not-found responses |
| `AFFILIATE_LINK` | No | Affiliate sign-up URL included in not-found emails |
| `VIDEO_LINK` | No | YouTube video URL embedded in the welcome email |
| `DISABLE_EMAIL_POLLING` | No | Set `true` to disable the Gmail worker without redeploying |
| `DISABLE_JOB_PROCESSING` | No | Set `true` to disable the verification + fulfillment workers |
| `POLL_CRON_SCHEDULE` | No | Cron expression for all workers. Default `*/15 * * * *` |

---

## API Reference

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | None | Liveness check |

**Response:**
```json
{ "success": true, "message": "BusinessDB API is running.", "timestamp": "..." }
```

---

### Verification (Public)

| Method | Path | Auth | Rate limited | Description |
|---|---|---|---|---|
| POST | `/api/verify-xm` | None | Yes — 100/15 min | Submit and verify an XM affiliate account |

**Request body:**
```json
{
  "name": "John",
  "surname": "Doe",
  "email": "john@example.com",
  "phone": "+27821234567",
  "xm_account_id": "12345678"
}
```

**Success (200):**
```json
{ "success": true, "message": "XM account verified.", "submission": { ... } }
```

**Not found (404):** Account ID not in approved accounts list. Response includes `affiliateCode` field pointing to the XM sign-up affiliate link.
```json
{ "success": false, "message": "Account not found.", "affiliateCode": "...", "affiliateLink": "..." }
```

**Conflict (409):** Account ID already claimed by another submission.

---

### Admin Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/admin/auth/login` | None | Authenticate and receive session cookie |
| POST | `/admin/auth/logout` | JWT | Clear session cookie |

**Login request body:**
```json
{ "email": "admin@sharesworldwide.trade", "password": "ChangeMe123!" }
```

**Login success (200):**
```json
{
  "success": true,
  "data": {
    "admin": { "id": "...", "fullName": "...", "email": "...", "role": "SUPER_ADMIN" }
  }
}
```

> The JWT is stored in an `admin_auth_token` HttpOnly cookie. It is never returned in the response body.
>
> Subsequent requests must include this cookie automatically (browser), or pass `Authorization: Bearer <token>` for non-browser clients.

---

### Admin Dashboard

All `/admin/*` routes require a valid JWT via the `admin_auth_token` cookie or `Authorization: Bearer` header.

| Method | Path | Min Role | Description |
|---|---|---|---|
| GET | `/admin/metrics` | SUPPORT | Live system metrics snapshot |
| GET | `/admin/submissions` | SUPPORT | Paginated submissions list |
| GET | `/admin/jobs` | SUPPORT | Paginated fulfillment jobs list |
| POST | `/admin/jobs/:id/retry` | ADMIN | Reset a failed job to PENDING |
| GET | `/admin/jobs/failed` | SUPPORT | Dead-letter queue entries |
| GET | `/admin/parser-logs` | SUPPORT | Gmail parser activity log |
| GET | `/admin/accounts` | SUPPORT | Approved XM accounts |
| GET | `/admin/audit-logs` | ADMIN | Full system audit trail |

**Pagination (all list endpoints):**

| Param | Default | Max | Description |
|---|---|---|---|
| `page` | `1` | — | 1-based page number |
| `limit` | `20` | `100` | Records per page |

**Submission filters:** `?status=PENDING|VERIFIED|FAILED|DUPLICATE&search=<email or name or account>`

**Job filters:** `?status=PENDING|PROCESSING|COMPLETED|FAILED&channel=WHATSAPP|EMAIL`

**Audit log filters:** `?event_type=<ADMIN_LOGIN|CAMPAIGN_CREATED|...>`

**Paginated response shape:**
```json
{
  "success": true,
  "data": [ ... ],
  "meta": { "total": 100, "page": 1, "limit": 20, "total_pages": 5 }
}
```

---

### Campaigns

| Method | Path | Min Role | Description |
|---|---|---|---|
| GET | `/admin/campaigns` | SUPPORT | List all campaigns |
| GET | `/admin/campaigns/:id` | SUPPORT | Get single campaign by UUID |
| POST | `/admin/campaigns` | ADMIN | Create a new campaign |
| PUT | `/admin/campaigns/:id` | ADMIN | Update a campaign (partial) |
| PATCH | `/admin/campaigns/:id/toggle` | ADMIN | Flip `isActive` status |
| DELETE | `/admin/campaigns/:id` | SUPER_ADMIN | Delete (only if zero linked submissions) |

**Create / update body:**
```json
{
  "campaignName": "XM South Africa Q3",
  "brokerName": "XM Global",
  "whopLink": "https://whop.com/your-link",
  "isActive": true
}
```

---

### Notification Templates

| Method | Path | Min Role | Description |
|---|---|---|---|
| GET | `/admin/templates` | SUPPORT | List all templates |
| GET | `/admin/templates/:id` | SUPPORT | Get single template by UUID |
| POST | `/admin/templates` | ADMIN | Create a new template |
| PUT | `/admin/templates/:id` | ADMIN | Update a template (partial) |
| PATCH | `/admin/templates/:id/toggle` | ADMIN | Flip `isActive` status |

**Create body:**
```json
{
  "templateName": "XM Verification Email v2",
  "notificationType": "EMAIL",
  "subjectLine": "Your XM Verification Was Successful",
  "templateBody": "<p>Hello {{name}}, your account {{xmAccountId}} is verified.</p>",
  "isActive": true
}
```

---

### Standard Response Envelope

Every endpoint returns one of these shapes:

```json
{ "success": true, "data": {} }
```
```json
{ "success": false, "message": "Human-readable error description." }
```
```json
{ "success": false, "message": "Validation failed.", "errors": [ ... ] }
```

---

## Background Workers

### Gmail Worker — `*/15 * * * *` (every 15 minutes, configurable via `POLL_CRON_SCHEDULE`)

Polls the Gmail inbox for new affiliate notification emails. Disable without redeployment: `DISABLE_EMAIL_POLLING=true`.

| Step | Action |
|---|---|
| 1 | Connect to IMAP server |
| 2 | Search for emails that are **unread AND unstarred** (`seen: false, flagged: false`) |
| 3 | Download and parse each email via mailparser |
| 4 | Extract the XM affiliate account ID using RegEx patterns |
| 5 | Save the account ID to `xm_approved_accounts` (skips if already exists) |
| 6 | **Star (`\Flagged`) the email** — email stays unread in the inbox; the star prevents reprocessing |
| 7 | Write a `parser_logs` entry (SUCCESS or FAILED) for every email processed |

### Fulfillment Worker — `*/15 * * * *` (every 15 minutes, configurable via `POLL_CRON_SCHEDULE`)

Processes pending notification delivery jobs in batches of 10. Disable without redeployment: `DISABLE_JOB_PROCESSING=true`.

| Step | Action |
|---|---|
| 1 | Fetch up to 10 `PENDING` jobs ordered by `createdAt ASC` |
| 2 | Set each job to `PROCESSING` to prevent duplicate pickup |
| 3 | Attempt WhatsApp or Email delivery |
| 4 | **On success:** mark job `COMPLETED`, write `fulfillment_logs` entry |
| 5 | **On failure:** throw error, increment `retryCount`, reset to `PENDING` for next cron tick |
| 6 | **After 3 failures:** mark permanently `FAILED`, copy to `failed_jobs` dead-letter queue |
| 7 | Use campaign's `whopLink` for the delivery link; falls back to `WHOP_LINK` env var |

### Metrics Worker — `*/15 * * * *` (every 15 minutes)

Aggregates current system counts and writes a `system_metrics` snapshot for historical trending on the dashboard.

---

## Roles & Permissions

| Role | Level | Access |
|---|---|---|
| `SUPPORT` | 1 | Read-only — all dashboard list and detail endpoints |
| `ADMIN` | 2 | Read + create, update, and retry — campaigns, templates, jobs |
| `SUPER_ADMIN` | 3 | Full access — includes hard deletes and audit log access |

---

## Database — Enums

### `AdminRole`

| Value | Description |
|---|---|
| `SUPER_ADMIN` | Full platform access including destructive operations |
| `ADMIN` | Create and mutate campaigns, templates, and retry jobs |
| `SUPPORT` | Read-only dashboard access |

### `SubmissionStatus`

| Value | Description |
|---|---|
| `PENDING` | Awaiting verification check |
| `VERIFIED` | XM account confirmed, fulfillment jobs queued |
| `FAILED` | Account ID not found in `xm_approved_accounts` |
| `DUPLICATE` | Account ID already claimed by a prior verified submission |

### `JobStatus`

| Value | Description |
|---|---|
| `PENDING` | Waiting to be picked up by the fulfillment worker |
| `PROCESSING` | Currently being executed — prevents double pickup by concurrent cron ticks |
| `COMPLETED` | Delivery succeeded |
| `FAILED` | All retry attempts exhausted — record moved to `failed_jobs` |

### `NotificationChannel`

| Value | Description |
|---|---|
| `WHATSAPP` | Delivery via Meta WhatsApp Cloud API |
| `EMAIL` | Delivery via Resend |

### `FulfillmentType`

| Value | Description |
|---|---|
| `WHATSAPP` | Recorded in `fulfillment_logs` for WhatsApp delivery attempts |
| `EMAIL` | Recorded in `fulfillment_logs` for Email delivery attempts |

> `NotificationChannel` and `FulfillmentType` share the same values but are kept separate enums — `NotificationChannel` is owned by the queue (`FulfillmentJob`, `FailedJob`) and `FulfillmentType` is owned by the immutable history (`FulfillmentLog`), allowing each to evolve independently.

### `DeliveryStatus`

| Value | Description |
|---|---|
| `PENDING` | Delivery attempt in progress |
| `SUCCESS` | Provider confirmed delivery |
| `FAILED` | Provider returned an error |

### `ParsingStatus`

| Value | Description |
|---|---|
| `SUCCESS` | Email parsed and account ID extracted |
| `FAILED` | Could not extract an account ID from the email body |

> Replaces the previous unconstrained `String?` column in `parser_logs`. Invalid values are now rejected at the database level.

---

## Database — Models

### `admin_users`

Stores internal platform administrators. Records are never deleted — deactivation is done via `isActive = false` to preserve audit log referential integrity.

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | `UUID` | No | Primary key |
| `fullName` | `TEXT` | No | Display name |
| `email` | `TEXT` | No | Login email — unique |
| `passwordHash` | `TEXT` | No | bcrypt hash |
| `role` | `AdminRole` | No | Permission tier. Default `ADMIN` |
| `isActive` | `BOOLEAN` | No | `false` = deactivated. Default `true` |
| `lastLoginAt` | `TIMESTAMP` | Yes | Stamped on every successful login |
| `createdAt` | `TIMESTAMP` | No | Record creation time |
| `updatedAt` | `TIMESTAMP` | No | Auto-updated by Prisma on every write |

---

### `xm_approved_accounts`

XM broker account IDs extracted from incoming affiliate notification emails by the Gmail worker. These are the authority for which account IDs can be verified.

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | `UUID` | No | Primary key |
| `accountId` | `TEXT` | No | XM account ID — unique |
| `emailSubject` | `TEXT` | Yes | Subject line of the source email |
| `senderEmail` | `TEXT` | Yes | From address of the source email |
| `rawEmailExcerpt` | `TEXT` | Yes | First 500 characters of the email body |
| `parsedSuccessfully` | `BOOLEAN` | No | `true` if account ID was extracted. Default `true` |
| `fetchedAt` | `TIMESTAMP` | No | When the record was created by the worker |

---

### `user_submissions`

Verification form submissions from end-users. One row per submission attempt. Records are never deleted — status changes provide the full lifecycle history.

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | `UUID` | No | Primary key |
| `name` | `TEXT` | No | First name |
| `surname` | `TEXT` | No | Last name |
| `email` | `TEXT` | No | Contact email |
| `phone` | `TEXT` | No | Phone in E.164 format (normalised on intake) |
| `xmAccountId` | `TEXT` | No | XM account ID submitted by the user |
| `status` | `SubmissionStatus` | No | Lifecycle status. Default `PENDING` |
| `verificationAttempts` | `INTEGER` | No | Number of verification attempts. Default `1` |
| `ipAddress` | `TEXT` | Yes | Submitter's IP for fraud detection |
| `campaignId` | `UUID` | Yes | FK → `campaigns.id`. Null if no campaign |
| `submittedAt` | `TIMESTAMP` | No | Form submission time |
| `updatedAt` | `TIMESTAMP` | No | Auto-updated by Prisma on every write |
| `fulfilledAt` | `TIMESTAMP` | Yes | Stamped when status transitions to `VERIFIED` |

---

### `fulfillment_jobs`

Notification delivery queue. Two rows are created for every verified submission — one `WHATSAPP` and one `EMAIL`. The fulfillment worker polls this table every minute.

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | `UUID` | No | Primary key |
| `submissionId` | `UUID` | No | FK → `user_submissions.id` |
| `notificationChannel` | `NotificationChannel` | No | `WHATSAPP` or `EMAIL` |
| `jobStatus` | `JobStatus` | No | Queue lifecycle status. Default `PENDING` |
| `retryCount` | `INTEGER` | No | Number of failed attempts so far. Default `0` |
| `lastError` | `TEXT` | Yes | Error message from the last failed attempt |
| `scheduledFor` | `TIMESTAMP` | No | Earliest time the worker should pick this job up |
| `processedAt` | `TIMESTAMP` | Yes | Stamped when job completes or permanently fails |
| `createdAt` | `TIMESTAMP` | No | Queue entry creation time |
| `updatedAt` | `TIMESTAMP` | No | Auto-updated by Prisma on every write |

---

### `fulfillment_logs`

Immutable delivery attempt history. One row is written per attempt — including every retry. Provides a complete audit trail of every delivery and the raw provider response.

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | `UUID` | No | Primary key |
| `submissionId` | `UUID` | No | FK → `user_submissions.id` |
| `fulfillmentType` | `FulfillmentType` | No | `WHATSAPP` or `EMAIL` |
| `deliveryStatus` | `DeliveryStatus` | No | Attempt outcome. Default `PENDING` |
| `providerResponse` | `TEXT` | Yes | Raw JSON response from Resend or WhatsApp API |
| `createdAt` | `TIMESTAMP` | No | Attempt time |

---

### `failed_jobs`

Dead-letter queue. Jobs that exceed the maximum retry count (3) are copied here before being permanently marked `FAILED`. Admins investigate these via the dashboard.

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | `UUID` | No | Primary key |
| `originalJobId` | `UUID` | No | ID of the source `fulfillment_jobs` row |
| `notificationChannel` | `NotificationChannel` | No | `WHATSAPP` or `EMAIL` |
| `failureReason` | `TEXT` | No | Final error message |
| `payloadSnapshot` | `JSONB` | No | Full copy of the `FulfillmentJob` row at failure time |
| `retryAttempts` | `INTEGER` | No | Total attempts made before dead-lettering |
| `failedAt` | `TIMESTAMP` | No | When the record was created |

> `payloadSnapshot` is the only intentional `Json` column in the schema. It stores a forensic snapshot of a complex row — not normalised relational data — which is the correct use of JSON.

---

### `campaigns`

Affiliate campaign configuration. Each campaign maps to a broker and a Whop community link. Submissions link to a campaign so the fulfillment worker sends the correct community link per campaign.

Soft-deleted via `deletedAt`. Campaigns with linked submissions cannot be hard-deleted.

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | `UUID` | No | Primary key |
| `campaignName` | `TEXT` | No | Human name — unique |
| `brokerName` | `TEXT` | No | Broker this campaign is associated with |
| `whopLink` | `TEXT` | No | Community access link sent to verified users |
| `isActive` | `BOOLEAN` | No | Whether the campaign accepts new submissions. Default `true` |
| `createdAt` | `TIMESTAMP` | No | Record creation time |
| `updatedAt` | `TIMESTAMP` | No | Auto-updated by Prisma on every write |
| `deletedAt` | `TIMESTAMP` | Yes | Set on soft delete. Queries must filter `WHERE deletedAt IS NULL` |

---

### `notification_templates`

Reusable message templates for WhatsApp and Email notifications. `subjectLine` is required for EMAIL templates. WhatsApp templates reference the `templateBody` for the Meta approved template component.

Soft-deleted via `deletedAt`.

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | `UUID` | No | Primary key |
| `templateName` | `TEXT` | No | Human name — unique |
| `notificationType` | `NotificationChannel` | No | `WHATSAPP` or `EMAIL` |
| `subjectLine` | `TEXT` | Yes | Email subject line (required for EMAIL templates) |
| `templateBody` | `TEXT` | No | Message body or template component content |
| `isActive` | `BOOLEAN` | No | Default `true` |
| `createdAt` | `TIMESTAMP` | No | Record creation time |
| `updatedAt` | `TIMESTAMP` | No | Auto-updated by Prisma on every write |
| `deletedAt` | `TIMESTAMP` | Yes | Set on soft delete |

---

### `parser_logs`

Immutable record of every email the Gmail worker processes. One row per email regardless of outcome.

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | `UUID` | No | Primary key |
| `emailSubject` | `TEXT` | Yes | Subject of the processed email |
| `senderEmail` | `TEXT` | Yes | From address of the processed email |
| `parsingStatus` | `ParsingStatus` | Yes | `SUCCESS` or `FAILED` |
| `extractedAccountId` | `TEXT` | Yes | The account ID extracted (on success) |
| `failureReason` | `TEXT` | Yes | Why extraction failed (on failure) |
| `createdAt` | `TIMESTAMP` | No | When the parser attempted this email |

---

### `system_metrics`

Point-in-time metric snapshots captured every 15 minutes. Used for historical trending charts on the dashboard. Records are never modified or deleted.

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | `UUID` | No | Primary key |
| `totalSubmissions` | `INTEGER` | No | Total `user_submissions` count |
| `successfulVerifications` | `INTEGER` | No | Submissions with status `VERIFIED` |
| `failedVerifications` | `INTEGER` | No | Submissions with status `FAILED` |
| `pendingJobs` | `INTEGER` | No | `fulfillment_jobs` with status `PENDING` |
| `completedJobs` | `INTEGER` | No | `fulfillment_jobs` with status `COMPLETED` |
| `failedJobs` | `INTEGER` | No | `fulfillment_jobs` with status `FAILED` |
| `parserFailures` | `INTEGER` | No | `parser_logs` with `parsingStatus = FAILED` |
| `createdAt` | `TIMESTAMP` | No | Snapshot time |

---

### `audit_logs`

Immutable, append-only record of every significant platform event — admin logins, campaign mutations, job retries, worker deliveries, and system errors.

`performedBy` stores the admin user UUID for human actions, or the literal string `"SYSTEM"` for automated worker events. It is a plain string (not a foreign key) so records remain readable even after an admin is deactivated.

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | `UUID` | No | Primary key |
| `eventType` | `TEXT` | No | Event category (e.g. `ADMIN_LOGIN`, `CAMPAIGN_CREATED`) |
| `eventDescription` | `TEXT` | No | Human-readable description of what happened |
| `entityId` | `TEXT` | Yes | UUID of the record this event relates to |
| `performedBy` | `TEXT` | Yes | Admin UUID or `"SYSTEM"` |
| `createdAt` | `TIMESTAMP` | No | Event time |

**Known event types:**

| Event Type | Trigger |
|---|---|
| `ADMIN_LOGIN` | Admin logs in |
| `ADMIN_LOGOUT` | Admin logs out |
| `FULFILLMENT_JOB_CREATED` | Fulfillment jobs queued after verification |
| `FULFILLMENT_COMPLETED` | Delivery succeeded |
| `FULFILLMENT_DEAD_LETTER` | Job moved to dead-letter queue |
| `JOB_MANUALLY_RETRIED` | Admin resets a failed job |
| `CAMPAIGN_CREATED` | New campaign created |
| `CAMPAIGN_UPDATED` | Campaign fields edited |
| `CAMPAIGN_STATUS_TOGGLED` | Campaign activated or deactivated |
| `CAMPAIGN_DELETED` | Campaign deleted |
| `TEMPLATE_CREATED` | New notification template created |
| `TEMPLATE_UPDATED` | Template fields edited |
| `TEMPLATE_STATUS_TOGGLED` | Template activated or deactivated |

---

## Database — Relationships

```
XmApprovedAccount (1) ──────────────────── (N) UserSubmission
Campaign          (1) ──────────────────── (N) UserSubmission
UserSubmission    (1) ──────────────────── (N) FulfillmentJob
UserSubmission    (1) ──────────────────── (N) FulfillmentLog
```

- A `UserSubmission` must reference a valid `XmApprovedAccount` (FK `RESTRICT`).
- A `UserSubmission` may optionally reference a `Campaign` (FK `SET NULL` on campaign delete).
- One `FulfillmentJob` and one `FulfillmentLog` exist per channel per submission.
- `AuditLog`, `FailedJob`, `ParserLog`, and `SystemMetric` have no foreign key relations — they are intentionally standalone for immutability.

---

## Database — Indexes

### Performance indexes (added in `production_hardening` migration)

| Table | Column(s) | Purpose |
|---|---|---|
| `user_submissions` | `xmAccountId` | Primary verification lookup — hit on every form submission |
| `user_submissions` | `submittedAt` | Ordered pagination on the dashboard submissions page |
| `user_submissions` | `email` | Search filter |
| `user_submissions` | `phone` | Duplicate phone check |
| `user_submissions` | `status` | Status filter |
| `user_submissions` | `campaignId` | Campaign-level analytics |
| `fulfillment_jobs` | `jobStatus` | Worker's primary `WHERE jobStatus = 'PENDING'` clause |
| `fulfillment_jobs` | `scheduledFor` | Ordered job pickup — future-dated delivery |
| `fulfillment_jobs` | `submissionId` | Per-submission job queries |
| `fulfillment_jobs` | `createdAt` | Dashboard ordered listing |
| `fulfillment_logs` | `submissionId` | All logs for a given submission (FK does not auto-index in PostgreSQL) |
| `fulfillment_logs` | `deliveryStatus` | Filter SUCCESS / FAILED on the jobs page |
| `fulfillment_logs` | `createdAt` | Ordered listing |
| `failed_jobs` | `failedAt` | Ordered listing |
| `failed_jobs` | `notificationChannel` | Filter by WHATSAPP / EMAIL |
| `failed_jobs` | `originalJobId` | Look up the source `FulfillmentJob` record |
| `campaigns` | `isActive` | Active-only campaign queries |
| `campaigns` | `createdAt` | Ordered listing |
| `campaigns` | `deletedAt` | Fast `WHERE deletedAt IS NULL` exclusion of soft-deleted rows |
| `notification_templates` | `notificationType` | Filter by channel |
| `notification_templates` | `isActive` | Active-only filter |
| `notification_templates` | `deletedAt` | Soft-delete exclusion |
| `parser_logs` | `parsingStatus` | Filter `FAILED` parses on the parser dashboard page |
| `parser_logs` | `createdAt` | Ordered listing |
| `audit_logs` | `eventType` | Filter by event category |
| `audit_logs` | `entityId` | All events for a specific record |
| `audit_logs` | `performedBy` | All actions by a specific admin |
| `audit_logs` | `createdAt` | Ordered listing |
| `xm_approved_accounts` | `fetchedAt` | Ordered listing on the accounts page |
| `xm_approved_accounts` | `parsedSuccessfully` | Parser failure rate aggregation |

> PostgreSQL does not automatically create indexes on foreign key columns (unlike MySQL). The `fulfillment_logs.submissionId` and `fulfillment_jobs.submissionId` indexes were added explicitly for this reason.

---

## Migrations

### Migration history

| Migration | Timestamp | Contents |
|---|---|---|
| `init` | 20260531193737 | `xm_approved_accounts`, `user_submissions`, `fulfillment_logs` + initial enums |
| `architecture_upgrade` | 20260531230033 | `campaigns`, `fulfillment_jobs`, `notification_templates`, `audit_logs`, `parser_logs` |
| `observability_layer` | 20260531231308 | `admin_users`, `failed_jobs`, `system_metrics` + `AdminRole` enum |
| `production_hardening` | 20260602000000 | `ParsingStatus` enum, `updatedAt`, `deletedAt`, `performedBy`, all missing indexes |

### Running migrations

```bash
# Apply all pending migrations to the target database
npm run db:migrate

# After editing schema.prisma during development
npx prisma migrate dev --name <migration_name>
```

### What `production_hardening` changes

1. Creates the `ParsingStatus` enum and migrates `parser_logs.parsingStatus` from `TEXT` to the new type using a safe `CASE`-based cast.

2. Adds `updatedAt TIMESTAMP NOT NULL` to `admin_users`, `user_submissions`, `fulfillment_jobs`, `campaigns`, and `notification_templates`. Existing rows are backfilled with `CURRENT_TIMESTAMP`.
3. Adds `deletedAt TIMESTAMP NULL` (soft-delete) to `campaigns` and `notification_templates`.
4. Adds `performedBy TEXT NULL` to `audit_logs`.
5. Adds all 25 missing performance indexes listed in the [Indexes](#database--indexes) section above.

---

## Deployment — Railway

This project ships a `railway.json` that configures Railway's build and start commands.

```json
{
  "build": { "builder": "NIXPACKS" },
  "deploy": {
    "startCommand": "npm start",
    "buildCommand": "npm run build"
  }
}
```

`npm run build` runs `prisma generate` to regenerate the Prisma client from the schema before the server starts. This is required because Railway clears the generated client between deploys.

**Trust proxy** (`app.set('trust proxy', 1)`) is enabled globally in `src/app.js`. Without this, rate limiting breaks behind Railway's reverse proxy because all requests appear to originate from the same IP.

**Migrations on Railway:**
- Use `DIRECT_URL` (non-pooled Supabase connection) for `prisma migrate deploy` — the pooled `DATABASE_URL` does not support migration commands.
- Run migrations manually via Railway's shell before/after a deploy, or wire them into the build step.

---

## Seed Strategy

The seed script at `scripts/seed.js` is fully idempotent — safe to run multiple times. It checks for existence before inserting so no duplicate data is created.

```bash
npm run seed
```

### What is seeded

| Entity | Value | Condition |
|---|---|---|
| `admin_users` | `admin@sharesworldwide.trade` / `ChangeMe123!` as `SUPER_ADMIN` | Created if no admin with that email exists |
| `campaigns` | `XM Default Campaign` pointing to `WHOP_LINK` env var | Created if no campaign with that name exists |
| `notification_templates` | `XM Verification — WhatsApp` | Created if template name does not exist |
| `notification_templates` | `XM Verification — Email` | Created if template name does not exist |

### Seed output

```
  sharesworldwide.trade — Database Seed

  ✔  SUPER_ADMIN: created (admin@sharesworldwide.trade)
  ✔  Campaign: created (XM Default Campaign)
  ✔  NotificationTemplate (WhatsApp): created (XM Verification — WhatsApp)
  ✔  NotificationTemplate (Email): created (XM Verification — Email)

  Seed complete.
```

On subsequent runs, every line shows `already exists` instead of `created`.

> **Security:** Change the default admin password immediately after the first login. The seed password `ChangeMe123!` is public in this repository.
