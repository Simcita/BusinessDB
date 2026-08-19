# Close the admin-dashboard gap: XM Accounts CRUD, Submissions management, Email Center

## Context

`BusinessDB` (this repo, `c:\Users\mlisa\OneDrive\Desktop\Modern Trader\backendsystem`) is the
Express 5 + Prisma 7 + Supabase backend for sharesworldwide.trade. The companion admin dashboard
is **`c:\Users\mlisa\OneDrive\Desktop\Modern Trader\admin`** — a Next.js 16 (App Router) app using
Server Components + Server Actions, shadcn/ui (Base UI, not Radix), Tailwind v4, and sonner for
toasts. (An earlier, unrelated copy exists at `Downloads\sharesworldwide-admin\admin` — not used;
ignore it.) It's a git repo on `main`, but essentially everything beyond the bare `create-next-app`
scaffold is still uncommitted working-tree state — not something this plan changes, just useful
context.

Research confirms all three features need **no Prisma schema changes** on the backend — every
field already exists on `XmApprovedAccount`, `UserSubmission`, and `NotificationTemplate`. One
correction to the original request: the fulfillment worker does **not** currently do
`{{variable}}` substitution on stored templates (it sends fully hardcoded HTML/WhatsApp payloads);
`NotificationTemplate` rows are never actually consumed by any worker today. The Email Center needs
a small new substitution utility written from scratch.

On the frontend, two things don't match the original task's assumptions, confirmed by reading the
actual code:
- **`campaigns/page.tsx` has no role-gating at all** — no `hasRole()` equivalent exists anywhere
  in this codebase. The only role-aware precedent is `/users`, which is *reactive* (Server
  Component tries the fetch, catches a 403, shows an Access Denied screen) rather than
  *proactive* (no `role`-based hide/show of individual buttons). Since the user explicitly wants
  proactive gating (and asked for a SUPER_ADMIN preview account specifically to see delete UI),
  this plan adds a small new `lib/auth.ts` with `get_current_admin()` / `has_role()` — extending
  the JWT-decode pattern that already exists inline in `users/page.tsx` (which only pulls
  `admin_id` out of the token today) to also read `role` (already present in the JWT payload per
  the backend's `jwt.js`, no backend change needed).
- **The login form has a real, currently-blocking bug**: `app/(auth)/login/page.tsx` posts
  `JSON.stringify({ email })` — the `password` field is captured in state but never sent. Since
  the backend requires both, **nobody can currently log in to this dashboard at all**, with any
  credential. This must be fixed first, or none of this work (including the new preview admin
  login) can ever be verified in the browser.

The user confirmed there is only **one** Supabase database (shared by local dev and the Railway
production deployment), and wants a **SUPER_ADMIN** preview credential so all new UI is visible.

---

## Part 1 — Backend (`backendsystem`)

Ground truth (verified by reading the actual files, not the aspirational `.agents/skills/*.md`
docs, which are out of date — e.g. real role checks are allowlist-based via
`authorize_roles([...])`, not the hierarchy comparator the docs describe):
- Full CRUD pattern: [campaign.controller.js](src/controllers/campaign.controller.js),
  [campaign.service.js](src/services/campaign.service.js),
  [campaign.routes.js](src/routes/campaign.routes.js)
- Simple mutation pattern: [admin-users.controller.js](src/controllers/admin-users.controller.js),
  [admin-users.service.js](src/services/admin-users.service.js) (untracked, newest)
- Audit logging: [audit.service.js](src/services/audit.service.js) — always
  `create_audit_log(event_type, description_with_actor_embedded, entity_id)`, no `performedBy` arg
- Role gating: [role.middleware.js](src/middleware/role.middleware.js) — allowlist, e.g.
  `authorize_roles(["ADMIN", "SUPER_ADMIN"])`. **Important:** wherever the spec below says an
  endpoint is "(ADMIN)", the middleware call must list **both** `["ADMIN", "SUPER_ADMIN"]`
  (matching every existing route) — a bare `["ADMIN"]` allowlist would lock SUPER_ADMIN out.
- Fulfillment job creation to reuse: `create_fulfillment_jobs(submission_id)` in
  [fullfilment.service.js](src/services/fullfilment.service.js) (keep the existing filename typo)
- Resend client to reuse: the module-level `resend` instance in
  [email.service.js](src/services/email.service.js)

### 1. XM Approved Accounts CRUD

`GET /admin/accounts` already lives in `admin.routes.js` / `admin.controller.js` /
`admin.service.js` — add the mutations to those same three files:

- **Validators** (append to [admin.validators.js](src/validators/admin.validators.js)):
  `create_xm_account_schema` (`accountId` required, `emailSubject`/`senderEmail`/
  `rawEmailExcerpt` optional strings, `parsedSuccessfully` optional boolean) and
  `update_xm_account_schema` (same fields, all optional).
- **Service** (append to [admin.service.js](src/services/admin.service.js)):
  `get_xm_approved_account_by_id`, `create_xm_approved_account` (409 if `accountId` already
  exists — mirror the duplicate-email check in `create_admin_user`), `update_xm_approved_account`,
  `delete_xm_approved_account`. Each mutation calls `create_audit_log` with `ACCOUNT_CREATED` /
  `ACCOUNT_UPDATED` / `ACCOUNT_DELETED`, description embedding `admin_id` and the `accountId`,
  exactly like `create_campaign`/`update_campaign`/`delete_campaign`.
- **Controller** (append to [admin.controller.js](src/controllers/admin.controller.js)):
  `add_xm_account`, `edit_xm_account`, `remove_xm_account` — mirror `add_campaign`/`edit_campaign`/
  `remove_campaign` exactly (zod `.parse`, 404 via the new `get_xm_approved_account_by_id`,
  `error instanceof z.ZodError` → 400, else `error.status || 500`).
- **Routes** (append to [admin.routes.js](src/routes/admin.routes.js), below the existing
  `GET /accounts`):
  ```
  POST   /accounts              authorize_roles(["ADMIN","SUPER_ADMIN"])
  PATCH  /accounts/:account_id  authorize_roles(["ADMIN","SUPER_ADMIN"])
  DELETE /accounts/:account_id  authorize_roles(["SUPER_ADMIN"])
  ```
  Response: flat `{ success, data: <account> }`, matching `get_submission_detail`'s convention in
  this same file (the frontend's `submissions/[id]/page.tsx` already relies on exactly this flat
  shape for `GET /admin/submissions/:id`, confirming it's the right envelope to extend).

### 2. User Submissions management

Same reasoning — extend `admin.routes.js` / `admin.controller.js` / `admin.service.js`.

- **Validator**: `update_submission_schema` — `status` optional enum
  (`PENDING|VERIFIED|FAILED|DUPLICATE`), `xmAccountId` optional nullable string.
- **Service**: `update_submission(submission_id, data, admin_id)` → `SUBMISSION_UPDATED`.
  `delete_submission(submission_id, admin_id)` → `SUBMISSION_DELETED`. `FulfillmentJob` and
  `FulfillmentLog` both have a required FK to `UserSubmission` with no cascade, so a bare
  `prisma.userSubmission.delete()` throws on any submission that already has jobs/logs (most
  VERIFIED ones). Wrap in `prisma.$transaction([...])`: delete `fulfillmentLog` rows, then
  `fulfillmentJob` rows, then the submission.
  `resend_submission_fulfillment(submission_id, admin_id)` → 404 via `get_submission_by_id` if
  missing, then call the existing `create_fulfillment_jobs(submission_id)` from
  `fullfilment.service.js` (don't duplicate its job-creation loop), then log
  `FULFILLMENT_RESENT`.
- **Controller**: `edit_submission`, `remove_submission`, `resend_submission` — same 404-then-call
  shape as the campaign controller.
- **Routes** (append to `admin.routes.js`):
  ```
  PATCH  /submissions/:submission_id          authorize_roles(["ADMIN","SUPER_ADMIN"])
  DELETE /submissions/:submission_id          authorize_roles(["SUPER_ADMIN"])
  POST   /submissions/:submission_id/resend   authorize_roles(["ADMIN","SUPER_ADMIN"])
  ```

### 3. Email Center (new files — same way campaign/template were introduced as new resources)

- **New utility** [src/utils/template.util.js](src/utils/template.util.js): `render_template(str, variables)`
  — `str.replace(/\{\{(\w+)\}\}/g, (m, key) => key in variables ? String(variables[key]) : m)`.
  Leaves unmatched placeholders intact. Genuinely new (confirmed nothing like it exists in `src/`),
  but a 3-line pure function.
- **email.service.js**: add `send_custom_email(to, subject, html)` alongside
  `send_verification_email` — reuses the same module-level `resend` client and the same
  try/catch → `{success, response}` return shape.
- **Validator**: `send_manual_email_schema` — `to` (email), `subject` (string), `templateId`
  (optional uuid), `rawBody` (optional string), `variables` (optional `z.record(z.string())`),
  `.refine()` requiring at least one of `templateId`/`rawBody`.
- **New service** `src/services/email-center.service.js`: `send_manual_email({to, subject,
  templateId, rawBody, variables}, admin_id)` — if `templateId` given, load the
  `NotificationTemplate` (404 if missing, 400 if `notificationType !== "EMAIL"`), run
  `render_template` over its `templateBody`; otherwise over `rawBody`. Call `send_custom_email`;
  502 on delivery failure. Log `EMAIL_SENT_MANUAL` on success.
- **New controller** `src/controllers/email-center.controller.js`: single `send_email` handler,
  same zod/try-catch shape as everywhere else.
- **New routes** `src/routes/email-center.routes.js`: `router.use(verify_admin_authentication)`
  then `POST /emails/send` gated `authorize_roles(["ADMIN","SUPER_ADMIN"])`.
- **app.js**: import + `app.use("/admin", email_center_routes)` in the same block as the other
  admin routers.

### 4. Prisma schema / migrations

No changes. Every field these endpoints touch already exists. `AuditLog.eventType` is a free-text
`String`, not an enum, so new event-type literals need no migration either.

### 5. Backend README updates

Following the existing `| Method | Path | Min Role | Description |` table style:
- Add the 6 new rows (3 accounts, 3 submissions) to the **Admin Dashboard** table (~line 377).
- Add a new **### Email Center** subsection after **Notification Templates** (~line 435).
- Add `ACCOUNT_CREATED`, `ACCOUNT_UPDATED`, `ACCOUNT_DELETED`, `SUBMISSION_UPDATED`,
  `SUBMISSION_DELETED`, `FULFILLMENT_RESENT`, `EMAIL_SENT_MANUAL` to the "Known event types" table
  (~line 781). (That table is already missing some older event types from prior work — leave
  those alone, out of scope here.)

---

## Part 2 — Admin dashboard (`Modern Trader\admin`)

### 6. Required prerequisite fix: login is currently broken

`app/(auth)/login/page.tsx` line 37 posts `JSON.stringify({ email })` — `password` is captured in
component state but never included in the request body, so the backend's
`password: z.string().min(8)` validation always rejects it. Fix: `body: JSON.stringify({ email, password })`.
Without this, the new preview admin (or any admin) cannot sign in, and none of this work can be
checked in a browser.

### 7. New `lib/auth.ts` — current-admin identity + role gating

No `hasRole()` equivalent exists today. Add a small server-only helper (uses `next/headers`
`cookies()`, so only callable from Server Components/Actions), extending the inline JWT-decode
already used privately in `users/page.tsx` (`get_admin_id_from_token`) to also read `role`:
```ts
export type CurrentAdmin = { admin_id: string; role: AdminRole };
export async function get_current_admin(): Promise<CurrentAdmin | null> { ... }
export function has_role(admin: CurrentAdmin | null, min: AdminRole): boolean { ... } // SUPPORT < ADMIN < SUPER_ADMIN
```
Server Component pages call `get_current_admin()` + `has_role(...)` and pass plain
`can_write`/`can_delete` booleans down as props to Client Components (Client Components can't call
`cookies()` themselves) — mirroring exactly how `users/page.tsx` already passes
`current_admin_id` down to `AdminUsersTable`. Leave `users/page.tsx`'s own private helper alone;
don't refactor it to use the new shared one — that's an unrelated file, out of scope here.

### 8. XM Approved Accounts — `actions/account.actions.ts` (new) + `AccountTable.tsx` (new)

`actions/account.actions.ts`, following the exact `campaign.actions.ts` shape (`"use server"`,
`server_fetch` from `@/lib/api`, `revalidatePath("/accounts")`): `create_xm_account_action`,
`update_xm_account_action` (partial payload, only truthy fields — same convention as
`update_campaign_action`), `delete_xm_account_action`. **Deliberately skip `redirect()`** on
create (campaigns' create/delete actions call `redirect()` after mutating, which — because the
calling Client Component wraps the call in try/catch and treats anything not
`instanceof Error` as a failure — produces a real, confirmed false-negative "Failed." toast right
before the redirect fires; not copying that bug into new code, matching how `update_campaign_action`/
`toggle_campaign_action` already work without `redirect()`).

`components/accounts/AccountTable.tsx` (new Client Component), modeled directly on
`CampaignTable.tsx`: `useState` for `create_open`/`edit_target`, `useTransition` for delete/pending,
two `Dialog`s with uncontrolled `<form action={...}>`, shadcn `Input`s for accountId/emailSubject/
senderEmail, a raw `<textarea>` for rawEmailExcerpt (same Tailwind class string
`TemplateTable.tsx` uses for `templateBody`), and a plain native checkbox for `parsedSuccessfully`
(no shadcn `Checkbox` exists in this project — adding one is unnecessary for a single boolean
field). Actions column: Edit (`can_write`) and Delete (`can_delete`, `confirm()` + `useTransition`,
same destructive-Button-outline pattern as Campaigns).

`app/(dashboard)/accounts/page.tsx`: keep `SearchInput`/`PaginationControls` at the page level
(unchanged), switch `next: { revalidate: 60, tags: ["accounts"] }` → `cache: "no-store"` (matching
the README's own stated convention that mutation-heavy pages go `no-store`), call
`get_current_admin()`/`has_role()`, and replace the inline `<Table>` with
`<AccountTable accounts={res.data} can_write={can_write} can_delete={can_delete} />` — the same
restructuring Campaigns already went through.

### 9. Submissions — `actions/submission.actions.ts` (new) + `SubmissionActions.tsx` (new)

No existing Submissions component to clone (both submission pages are currently 100% read-only) —
adapting the Campaigns/Jobs patterns rather than copying a precedent that doesn't exist. Placement
decision: edit/delete/resend go on **`submissions/[id]/page.tsx`** (the detail page), not the list
row — the detail page already fetches `fulfillmentJobs`, so "resend" sits naturally next to that
table, and there's no existing inline-row-actions pattern on the list to imitate.

`actions/submission.actions.ts`: `update_submission_action(id, form_data)` → `PATCH
/admin/submissions/:id`, `revalidatePath` both `/submissions` and `/submissions/[id]`.
`delete_submission_action(id)` → `DELETE /admin/submissions/:id`, `revalidatePath("/submissions")`
— **no server-side `redirect()`**; since the client already knows the call succeeded (no exception
thrown), it calls `router.push("/submissions")` itself after `await`, which avoids the
redirect-in-try/catch false-toast issue entirely (a small, deliberate improvement over the
campaigns pattern, not a blind copy). `resend_submission_fulfillment_action(id)` → `POST
/admin/submissions/:id/resend`, `revalidatePath("/submissions/[id]")`.

`components/submissions/SubmissionActions.tsx` (new Client Component), rendered in the detail
page's header: Edit button → small `Dialog` with a shadcn `Select` for `status` (using the same
"inject controlled value into FormData via `fd.set()` before submit" trick `TemplateTable.tsx`
already uses for its `notificationType` Select) and an `Input` for `xmAccountId`; Delete button
(`can_delete`, `confirm()`, `useTransition`, then `router.push`); "Resend fulfillment" button
(`can_write`, `useTransition`, `toast` on result) placed near the Fulfillment Jobs table.

`submissions/page.tsx` (list): unchanged.

### 10. Email Center — new route, action, and form

`actions/email.actions.ts` (new): `send_email_action(form_data)` — reads `mode` ("template" |
"raw") plus `to`/`subject`/`templateId`-or-`rawBody`, parses a `variables` textarea (one
`key=value` per line) into a plain object client-side of the action, and calls
`server_fetch("/admin/emails/send", {method:"POST", body: JSON.stringify(payload)})`. No
`revalidatePath` needed — nothing else reads this data.

`app/(dashboard)/emails/page.tsx` (new) — Server Component, following the `/users` access-denied
precedent for role gating (this project's only real precedent for a fully-gated page): calls
`get_current_admin()`/`has_role(admin, "ADMIN")`; if false, render the same Access Denied shell
`users/page.tsx` uses. Otherwise fetch `GET /admin/templates` (`cache: "no-store"`), filter to
`notificationType === "EMAIL"`, and render `<EmailSendForm templates={email_templates} />`.

`components/emails/EmailSendForm.tsx` (new Client Component) — `to`/`subject` `Input`s, a mode
toggle (Template vs. Raw), Template mode shows a shadcn `Select` of the EMAIL templates (id →
templateName), Raw mode shows a raw `<textarea>` (same class as `AccountTable`'s excerpt field),
a `variables` `<textarea>` (`key=value` per line, placeholder shows the shape), submits via native
`<form action={...}>` wrapped in `try/catch` → `toast.success`/`toast.error`, matching every other
mutation in this codebase. No new shadcn primitives needed (no `Sheet`, no `AlertDialog` — a plain
page + `Dialog`-free form is enough for a single-send v1).

`components/layout/Sidebar.tsx`: add one entry to `nav_items` after Templates —
`{ href: "/emails", label: "Email Center", icon: <mail glyph, same viewBox/stroke as the rest> }`.
No `proxy.ts`/middleware change needed — its matcher already covers any new route under `/`.

### 11. Frontend README updates

- Add one row to the **Pages** table for `/emails`.
- Add a row to the **Caching strategy** table for `/emails` (`no-store` — mutation-only page).
- Add rows to **Backend API Reference** for the 6 new accounts/submissions endpoints and
  `POST /admin/emails/send`.
- Leave the pre-existing `middleware.ts` (stale — actual file is `proxy.ts`) and missing
  `/admin/users` rows alone — out of scope here, same reasoning as the backend README.

---

## Part 3 — Preview admin credential (production Supabase — the only DB that exists)

Create it through the **existing** `POST /admin/users` endpoint (SUPER_ADMIN-gated, already built
in `admin-users.routes.js`) rather than a raw DB script — also serves as a smoke test of that
endpoint. This only becomes checkable in the browser once the login fix (Part 2, §6) lands.

1. Run `npm run seed` in `backendsystem` (idempotent — only creates the default SUPER_ADMIN
   `admin@sharesworldwide.trade` / `ChangeMe123!` if missing; touches nothing else).
2. Log in as that SUPER_ADMIN via `POST /admin/auth/login`.
3. Call `POST /admin/users` with:
   - email: `preview-admin@sharesworldwide.trade`
   - password: `PreviewAdmin2026!` (recorded here for visibility — rotate if this file is ever
     shared)
   - role: `SUPER_ADMIN`
4. Report the credential back once created.

---

## Verification

1. Backend: start the server locally against the real `DATABASE_URL` and exercise the new
   endpoints directly (curl/Postman) for at least one success and one role-denied case each,
   before touching the frontend.
2. Frontend: apply the login fix first (§6), then `npm run dev` in `Modern Trader\admin` with
   `NEXT_PUBLIC_API_URL` pointed at the local backend. Log in with
   `preview-admin@sharesworldwide.trade`, and click through Accounts (create/edit/delete),
   Submissions detail (edit/delete/resend), and the new Email Center page end-to-end in the
   browser.
3. `npm run build` in both projects, fix any TypeScript errors. Note: neither project has an
   ESLint config/script (confirmed absent in both `package.json`s), so there is no separate lint
   step to run.
4. Confirm `git status` in `backendsystem` shows the expected new/modified files. The dashboard
   project's git history is essentially just the initial scaffold commit with everything else
   uncommitted — not something this plan changes; just don't be surprised by a large diff if you
   check `git status` there.

---

*Companion reference: see `context.md` in this same directory for a detailed, feature-independent
reference on both codebases' architecture, patterns, and known gotchas.*
