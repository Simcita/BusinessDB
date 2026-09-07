# Codebase Context Reference — BusinessDB backend & Modern Trader admin dashboard

Everything below was confirmed by directly reading the actual source, not inferred from docs
(the `.agents/skills/*.md` files in `backendsystem` and the README in `admin` both drift from the
real code in places — noted inline where it matters). This is a general-purpose reference,
independent of any specific feature — see `AI_work.md` in this same directory for the current
implementation plan (XM Accounts CRUD, Submissions management, Email Center) that this context
was gathered for.

---

## A. Backend — `backendsystem` (Express 5 + Prisma 7 + Supabase)

**Stack & runtime**: Express 5, Prisma 7 (`prisma.config.ts` holds the DB URL — Prisma 7 removed
`url=` from `schema.prisma`), Zod for validation, bcrypt for passwords, `jsonwebtoken` for auth,
Resend for outbound email, `node-cron` for scheduling. **No queue library** (no BullMQ/Bull/Agenda)
— the "fulfillment queue" is a plain Postgres table (`FulfillmentJob`) polled by cron every
`POLL_CRON_SCHEDULE` (default 15 min).

**Request flow**: `src/app.js` wires middleware (`helmet`, `cors` with `credentials:true` against
`FRONTEND_URL`, `express.json()`, `morgan`) then mounts routers: `/health`, `/api` (rate-limited
public verification routes), `/admin/auth` (login/logout, unauthenticated), then several routers
all mounted at `/admin` — `admin_routes`, `campaign_routes`, `template_routes`,
`admin_users_routes` (in that order) — each internally `router.use(verify_admin_authentication)`
before defining its own sub-paths. `global_error_handler` is mounted last.

**Auth**: `POST /admin/auth/login` → `admin-auth.service.js` looks up `AdminUser` by email,
`bcrypt.compare`, updates `lastLoginAt` → `jwt.js#generate_admin_token` signs
`{admin_id, role}` (7-day expiry) → sets HttpOnly cookie `admin_auth_token` **and** returns
`token` in the JSON body (needed because the dashboard is a different origin/port and can't read
the backend's own Set-Cookie). `auth.middleware.js#verify_admin_authentication` decodes the JWT
into `request.admin = {admin_id, role}` for every downstream handler. `role.middleware.js` exports
`authorize_roles(allowed_roles_array)` — a plain **allowlist** check
(`allowed_roles.includes(request.admin.role)`), **not** a hierarchy comparator, despite what
`.agents/skills/security-standards.md` describes. This is why every existing route that should
admit both ADMIN and SUPER_ADMIN explicitly lists both: `authorize_roles(["ADMIN","SUPER_ADMIN"])`.

**Response convention**: every controller hand-rolls `response.status(n).json({success, ...})` in
a `try/catch` — `src/utils/response.js`'s `success_response()`/`error_response()` helpers exist
but are **never actually used** anywhere (despite `.agents/skills/express-standards.md` implying
they should be). Three response envelope shapes coexist by precedent:
- Paginated list endpoints (`admin.controller.js`): `{success, data: T[], meta}` — flat array.
- Single-entity ops in `campaign.controller.js`/`template.controller.js`: `{success, data: {campaign: {...}}}` — wrapped under a singular key.
- Single-entity ops already in `admin.controller.js` (`get_submission_detail`): `{success, data: {...}}` — flat, no wrapper.

**Audit logging** (`audit.service.js`, 46 lines total):
```js
export const create_audit_log = async (event_type, event_description, entity_id = null) => {
    await prisma.auditLog.create({ data: { eventType: event_type, eventDescription: event_description, entityId: entity_id } });
};
```
`performedBy` is defined on the `AuditLog` model but **never actually set** by this helper — every
call passes only 3 positional args. The actor is instead embedded in the human-readable
`event_description` string (e.g. `` `Admin ${admin_id} created campaign "${name}".` ``). `eventType`
is a free-text `String` column, not a Prisma enum — new event-type literals need no migration.

Existing event types (grepped across `src/`): `ADMIN_LOGIN`, `ADMIN_LOGOUT`, `ADMIN_USER_CREATED`,
`ADMIN_USER_TOGGLED`, `CAMPAIGN_CREATED/UPDATED/STATUS_TOGGLED/DELETED`,
`TEMPLATE_CREATED/UPDATED/STATUS_TOGGLED`, `JOB_MANUALLY_RETRIED`, `FULFILLMENT_JOB_CREATED`,
`FULFILLMENT_COMPLETED`, `FULFILLMENT_DEAD_LETTER`, `SUBMISSION_CREATED`, `SUBMISSION_VERIFIED`.
Naming convention: `<ENTITY>_<PAST_TENSE_ACTION>`. The README's "Known event types" table
(~line 781) is already missing a few of these — pre-existing drift.

**Prisma models** (all in `prisma/schema.prisma`):
- `AdminUser` (`admin_users`): `id, fullName, email @unique, passwordHash, role AdminRole @default(ADMIN), isActive @default(true), lastLoginAt, createdAt, updatedAt`. Never hard-deleted — `isActive=false` instead, to keep audit-log references valid.
- `XmApprovedAccount` (`xm_approved_accounts`): `id, accountId @unique, emailSubject?, senderEmail?, rawEmailExcerpt?, parsedSuccessfully @default(true), fetchedAt`. Has `submissions UserSubmission[]` back-relation.
- `UserSubmission` (`user_submissions`): `id, name, surname, email, phone, submittedAccountId, xmAccountId String? (FK → XmApprovedAccount.accountId), status SubmissionStatus @default(PENDING), verificationAttempts @default(1), ipAddress?, campaignId?, submittedAt, updatedAt, fulfilledAt?`. `submittedAccountId` is whatever the user typed (no FK); `xmAccountId` is only populated once VERIFIED. A conditional unique index (raw SQL, not in schema.prisma) prevents two active (`PENDING`/`VERIFIED`) claims on the same `submittedAccountId`. Design comment on the model says "Records are never deleted."
- `FulfillmentJob` (`fulfillment_jobs`) / `FulfillmentLog` (`fulfillment_logs`): both have a required FK to `UserSubmission` with no `onDelete` cascade — must be deleted first (in a transaction) before a `UserSubmission` can be hard-deleted.
- `NotificationTemplate` (`notification_templates`): `id, templateName @unique, notificationType NotificationChannel (WHATSAPP|EMAIL), subjectLine?, templateBody, isActive, createdAt, updatedAt, deletedAt?` (soft-delete). Seed data (`scripts/seed.js`) already contains `{{name}}`/`{{xmAccountId}}`/`{{whopLink}}`-style placeholders in the EMAIL template and `{{1}}`/`{{2}}`/`{{3}}` in the WHATSAPP one — but **nothing in the codebase actually substitutes them today**; confirmed via grep, no `.replace(/\{\{.../` exists anywhere in `src/`. The fulfillment worker sends fully hardcoded HTML (`email.service.js#send_verification_email`) and a hardcoded Meta WhatsApp template call, never reading `NotificationTemplate` rows at all.
- `AuditLog` (`audit_logs`): `id, eventType String, eventDescription String, entityId String?, performedBy String?, createdAt`.
- `Campaign` (`campaigns`): `id, campaignName @unique, brokerName, whopLink, isActive, createdAt, updatedAt, deletedAt?` (soft-delete — can't hard-delete a campaign with linked submissions).

**Enums**: `AdminRole {SUPER_ADMIN, ADMIN, SUPPORT}`, `SubmissionStatus {PENDING, VERIFIED, FAILED, DUPLICATE}`, `JobStatus {PENDING, PROCESSING, COMPLETED, FAILED}`, `NotificationChannel {WHATSAPP, EMAIL}` (and a deliberately-duplicate `FulfillmentType` used only by `FulfillmentLog`), `DeliveryStatus {PENDING, SUCCESS, FAILED}`, `ParsingStatus {SUCCESS, FAILED}`.

**Fulfillment flow**: `fullfilment.service.js` (filename typo, intentionally kept) exports
`create_fulfillment_jobs(submission_id)` — creates one `FulfillmentJob` row per channel
(`WHATSAPP`, `EMAIL`), status `PENDING`. `fulfillment.worker.js` (cron) polls 10 `PENDING` jobs at
a time, dispatches to `email.service.js#send_verification_email` or `whatsapp.service.js`, logs
every attempt to `FulfillmentLog`, retries up to `MAXIMUM_RETRY_COUNT=3` then moves to
`FailedJob` (dead-letter) via `retry.service.js#move_job_to_dead_letter_queue`.

**Email**: `email.service.js` — module-level `const resend = new Resend(process.env.RESEND_API_KEY)`, one exported function `send_verification_email(recipient_email, customer_name, xm_account_id)` with a fully inline hardcoded HTML template. `gmail.service.js` (despite the name) is **not** related to outbound email — it's an IMAP inbox parser (`ImapFlow`+`mailparser`) that reads *incoming* XM affiliate notification emails to extract approved account IDs.

**Admin credentials today**: `scripts/seed.js` (`npm run seed`, idempotent) upserts
`admin@sharesworldwide.trade` / `ChangeMe123!` as `SUPER_ADMIN`, plus a default `Campaign` and two
`NotificationTemplate`s. There's a legacy `scripts/seed-admin.js` the README calls superseded —
don't touch it. New admins can also be created via `POST /admin/users` (SUPER_ADMIN-gated,
`admin-users.routes.js`/`.controller.js`/`.service.js` — untracked/newest code in the repo as of
this writing).

**Migrations**: `prisma/migrations/` — `20260531193737_init`, `20260531230033_architecture_upgrade`,
`20260531231308_observability_layer`, `20260602000000_production_hardening`,
`20260603000000_async_verification`. `package.json`'s `db:migrate` script runs
`prisma migrate deploy`; local schema changes use `npx prisma migrate dev --name <x>` directly
(not a package.json script).

**Deployment**: Railway, connected to a Supabase Postgres instance. There is only **one** database
— no separate local/dev database — shared by whatever runs locally against the real
`DATABASE_URL` and the Railway production deployment.

---

## B. Frontend — `Modern Trader\admin` (Next.js 16, App Router)

**Not** `sharesworldwide-admin` in `Downloads\` — that's a different, unrelated, less-developed
copy of an admin dashboard that happens to target the same backend API shape but has diverged
UI/architecture. Don't confuse the two. This project's actual branding is "Modern Trader — Admin
Dashboard" / "Affiliate Management System" (see the login page's left decorative panel). It's a
git repo (`main` branch) but almost nothing beyond the initial `create-next-app` scaffold commit
has ever been committed — everything described here is uncommitted working-tree state.
`.env.local` sets exactly one var, `NEXT_PUBLIC_API_URL` (→ `http://localhost:5000`).

**Stack**: Next.js 16.2.7, React 19.2.4, shadcn/ui **on Base UI** (not Radix — every
`components/ui/*.tsx` imports from `@base-ui/react/*`; `components.json` → `"style": "base-nova"`),
Tailwind v4, `sonner` (toasts), `swr` (client-side polling only, used by `hooks/useMetrics.ts`),
`recharts` (dashboard trend chart). **No** `zod`, **no** `react-hook-form`, **no** ESLint config
at all (no `eslint` dependency, no config file, no `lint` script).

**Two fetch primitives, used for two different purposes**:
- `lib/api.ts#server_fetch<T>(path, options)` — server-only (reads `next/headers` `cookies()`,
  forwards `admin_auth_token` as a `Cookie` header to the Express backend). Used by every Server
  Component page and every Server Action. Throws `Error("UNAUTHORIZED")` on 401, throws a plain
  `Error` with the backend's message on other non-2xx.
- `lib/fetcher.ts#fetcher(url)` — client-side, used only by SWR hooks, calls same-origin Next.js
  routes (not the Express backend directly).
- `app/api/proxy/[...path]/route.ts` — generic auth-forwarding Route Handler for client-side SWR
  requests (e.g. `/api/proxy/admin/metrics`). Only implements `GET`/`POST`/`PATCH` — no
  `PUT`/`DELETE`.

**Auth mechanics**: `app/api/auth/login/route.ts` proxies to `POST {API_BASE}/admin/auth/login`,
reads `data.data.token` from the JSON body (not Set-Cookie — different origin/port), sets its own
HttpOnly cookie `admin_auth_token` on the Next.js origin. `proxy.ts` (root — Next 16 renamed
`middleware.ts`→`proxy.ts`; the export function must be named `proxy`, not `middleware`; the
project's own README is stale and still says `middleware.ts`) checks only cookie *presence* on
every route except `/login` and `/api/*`, redirecting to `/login?redirect=<path>` if absent.

**Known bug (confirmed, currently blocking)**: `app/(auth)/login/page.tsx` posts
`JSON.stringify({ email })` — the `password` field is captured via a controlled input into
component state but never included in the login request body, even though the backend requires
both. **Nobody can currently log in to this dashboard, with any credential, until this is fixed**
(one-line fix: include `password` in the JSON body).

**Role identity**: no `hasRole()` anywhere. The only place a JWT claim is read is
`users/page.tsx`'s private inline `get_admin_id_from_token()`, and it only extracts `admin_id`
(not `role`) — done purely to render a "(you)" label / self-toggle-guard in `AdminUsersTable`. No
signature verification is performed (trusts the cookie because it's HttpOnly and was set by the
trusted login Route Handler).

**Role gating today, precisely**: zero proactive gating anywhere except `/users`, and even that is
*reactive* — the Server Component tries `server_fetch("/admin/users")`, and on **any** thrown
error (401, 403, or otherwise — the catch-all is overly broad) renders an "Access Denied" fallback
instead of the table. `campaigns/page.tsx`/`templates/page.tsx` show Edit/Toggle/Delete buttons to
every authenticated admin unconditionally, regardless of role — the backend is the only thing
actually enforcing permissions there today.

**Server Action pattern** (`actions/*.actions.ts` — `campaign.actions.ts`, `template.actions.ts`,
`job.actions.ts`, `admin-users.actions.ts` are the existing ones):
- `"use server"` header, import `revalidatePath` from `next/cache` (exclusively — `revalidateTag`
  appears in the README's Pattern-3 example but is **never actually used** in real code) and
  `server_fetch` from `@/lib/api`.
- Create actions take `(form_data: FormData)`; update actions take `(id, form_data)`; bare actions
  (toggle/delete/retry) take `(id)`.
- Payload built via `form_data.get("x") as string` — no schema validation layer anywhere.
  Update actions build a **partial** payload (only truthy fields get set) — clearing a field to
  empty-string is not possible via this pattern as written.
- `create_*_action`/`delete_*_action` for Campaigns/Templates call `redirect()` after mutating.
  **Confirmed real bug**: the calling Client Component wraps these in `try/catch` and shows
  `toast.error` for anything not `instanceof Error`; Next's `redirect()` throws a non-`Error`
  digest, so a successful create/delete still flashes a false "Failed." toast right before
  navigating away.
- Two call shapes from Client Components: native `<form action={async (fd) => {...}}>` for
  create/update (wrapping the action call in try/catch for toast feedback), or
  `useTransition` + direct async call for toggle/delete/retry-style bare actions. Delete
  confirmation is always a bare `window.confirm()` — **no `AlertDialog` component exists in this
  codebase at all**.
- Controlled shadcn `Select` values must be manually injected into `FormData` before submit
  (`fd.set("notificationType", state)`) since these aren't real native `<select>` elements — see
  `TemplateTable.tsx`.

**Response envelope quirks by page** (matters when typing any new `server_fetch<T>()` call):
- Paginated list endpoints (Accounts, Submissions, Jobs, Parser Logs, Audit Logs): `{success, data: T[], meta}`.
- Campaigns/Templates list: `{success, data: {campaigns: [...]}}` / `{data: {templates: [...]}}` — nested under a singular/plural key, **not** a flat array, despite both being simple lists. Confirmed this actually matches what `campaign.controller.js`'s `list_campaigns` really returns server-side (not a frontend bug).
- Submission detail (`GET /admin/submissions/:id`): `{success, data: SubmissionDetail}` — flat.

**Components available to reuse** (`components/ui/`): `button` (variants: default/outline/secondary/ghost/destructive/link; sizes incl. icon/icon-xs/icon-sm/icon-lg), `card`, `table`, `badge`, `input`, `select`, `separator`, `label`, `dialog`, `sonner`. **Not present**: `checkbox`, `textarea` (raw `<textarea>` + copy-pasted Tailwind classes used instead, see `TemplateTable.tsx`), `alert-dialog`, `sheet`, `form`.

**Caching convention** (from the frontend's own README, confirmed matching real code): read-mostly
list pages use `next: { revalidate: <seconds>, tags: [...] }`; anything mutation-heavy (Campaigns,
Templates) uses `cache: "no-store"`.

**Sidebar** (`components/layout/Sidebar.tsx`): `"use client"`, `usePathname()`-driven active state
(`pathname.startsWith(href)` except `/dashboard` which needs exact match), a typed
`nav_items` array of `{href, label, icon}` (icon = inline SVG matching a shared viewBox/stroke
convention, not `lucide-react` components despite that package being a dependency). Current order:
Dashboard, Submissions, XM Accounts, —, Jobs, Jobs/Failed, —, Campaigns, Templates, —, Parser Logs,
Audit Logs, —, Admin Users. No role-gating on nav visibility — every link always renders; pages
enforce access themselves.

**Routes note**: this project uses `/accounts` (not `/xm-accounts`) and submission detail is its
own route `/submissions/[id]` (not a modal) — both differ from the unrelated Downloads copy.

**Pages implemented today**: `/login`, `/dashboard` (live metrics, 60s SWR refresh),
`/submissions` (read-only list) + `/submissions/[id]` (read-only detail), `/accounts` (read-only
list), `/jobs` (queue + inline retry) + `/jobs/failed` (dead-letter), `/campaigns` (full CRUD),
`/templates` (create/edit/toggle, no delete), `/parser-logs` (read-only), `/audit-logs`
(read-only), `/users` (create/toggle, SUPER_ADMIN-gated reactively, no delete).

**Stray artifact, harmless**: a malformed, empty, untracked directory sits in the project root
with a mangled literal-path name (colons/backslashes mapped to Unicode Private Use Area
codepoints) — leftover from some earlier tool run gone wrong. Confirmed empty and harmless; not
worth cleaning up unless it starts causing problems.

---

## 2026-09-07 — Gmail worker outage: root cause, fix, and a live-test incident

**Reported symptom**: `gmail.worker.js` had been logging `Gmail worker error: Command failed` on
every 15-minute tick since 2026-08-20, with no successful IMAP polls in between.

**Root cause of the log message (confirmed from `imapflow` source,
`node_modules/imapflow/lib/imap-flow.js`)**: `"Command failed"` is a hard-coded literal `imapflow`
throws for *any* IMAP command (`LOGIN`, `SELECT`, `SEARCH`, `STORE`...) that gets a tagged
`NO`/`BAD` server response. The real reason lives on `err.responseText`/`responseStatus`/
`executedCommand`/`code`, which `gmail.service.js` was not logging — every failure looked
identical. Not a code regression: `process_xm_emails()` (the connect/login/search function)
hadn't changed since 2026-06-03; the three commits that landed on 2026-08-20 only touched
email-body parsing, an unrelated Zod fix, and HTML-escaping elsewhere.

**Fix shipped** (`gmail.service.js` + `gmail.worker.js`): added `describe_imap_error()` to surface
the real IMAP failure reason in logs; added in-memory health state
(`consecutive_failures`/`last_success_at`/`last_failure_at`); `process_xm_emails()` now **rethrows**
on connect/login/search failure (previously swallowed, which made the worker's own backoff counter
dead code — confirmed via grep it has exactly one caller, `safe_poll()`); added one-alert-per-outage
emailing via the existing `send_custom_email()` + `create_audit_log()` helpers once failures hit
`GMAIL_ALERT_THRESHOLD` (new optional env var, default 3, ~1h15m of sustained failure given the
existing tick-skipping backoff); restored an immediate on-startup poll that commit `2729976`
(2026-08-20) had silently dropped, so every restart no longer waits a full cron interval for the
first check. New optional env vars: `GMAIL_ALERT_THRESHOLD`, `GMAIL_ALERT_EMAIL` (comma-separated,
unset = alerting disabled). New diagnostic script: `scripts/test-gmail-connection.js`.

**Live local test (same day) — the actual production IMAP credentials work.** Running the server
locally against the real `.env` (real IMAP mailbox, real production Supabase DB — confirmed via
this project's single-database setup, see §A above) showed `Connected to IMAP server.` and
successfully drained the full backlog (596, then a remaining 354 unseen emails) within seconds per
message. **This means the Aug 20 – Sep 7 outage's root cause is external** (mailbox credentials,
account lock, or DNS on the `privateemail.com`-hosted mailbox around 2026-08-19/20) — not
reproducible from this repo's code once valid credentials are in place. Verification/fulfillment
workers were deliberately run with `DISABLE_JOB_PROCESSING=true` during this backlog drain to avoid
firing real welcome emails/WhatsApp messages to customers as a side effect of clearing 18 days of
backlogged approvals in one burst.

**Incident discovered during that test: a production schema drift silently dropped data.**
Between **12:28:06 and 12:33:40 UTC**, the `xm_approved_accounts.rawEmailExcerpt` column
disappeared from the live Supabase database (confirmed via direct `information_schema` queries —
only one schema, only one table by that name, column genuinely absent). Cause unknown — not
triggered by anything run in this session, and there is no migration in this repo that drops it
(only migration that has ever existed, `20260531193737_init`, *creates* it as `TEXT`, and
`schema.prisma` still declares it). Effect: every `xmApprovedAccount` query started throwing
`P2022 column does not exist`, which (a) broke the admin dashboard's accounts list entirely (its
default `findMany()` selects all columns) and (b) caused ~300 of the in-flight backlog emails to be
marked `\Flagged` (the "processed" marker) by `process_xm_emails()`'s per-message error handling
*without* their data ever being saved — `\Flagged` is set unconditionally after
`process_email_message()` regardless of whether it internally caught an error, so these would never
have been retried by normal polling. **Also discovered while investigating this**: `TaskStop` on a
background shell task on this Windows machine kills the shell wrapper but not the underlying
`node.exe` child — a stray first server instance (with fulfillment/verification *not* disabled) kept
running unnoticed for ~40 minutes and crossed three cron ticks; confirmed via direct query
(`fulfillment_logs`, `audit_logs`) that zero real sends occurred (there were zero `PENDING`
`UserSubmission` rows to match against), then force-killed via
`Get-CimInstance Win32_Process | Stop-Process`.

**Remediated same day**: column restored (`ALTER TABLE xm_approved_accounts ADD COLUMN IF NOT
EXISTS "rawEmailExcerpt" TEXT;`, matching the original migration exactly); a recovery script
(`scripts/recover-flagged-backlog.js`, kept in-repo — re-scans `{flagged:true, since:2026-08-20}`
and re-saves via the same `accountId`-uniqueness dedup `save_xm_account()` already uses, so it's
safe to re-run) recovered all 180 accounts that had been silently dropped (415 already-saved ones
were correctly skipped as duplicates, 0 errors). `xm_approved_accounts` row count: 1861 → 2041.

**Still open**: what actually dropped the column is unknown — worth watching for recurrence (a
`prisma db push` from a schema missing this field, or a manual `ALTER TABLE`/Supabase Studio edit,
are the most likely culprits given no migration file in this repo does it).
