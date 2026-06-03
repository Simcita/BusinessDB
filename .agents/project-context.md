# sharesworldwide.trade Automation Platform

## Business Objective

Automate the verification of XM affiliate signups and automatically fulfil community access links through WhatsApp and Email.

The current manual process:

XM Affiliate Email
→ Partner receives notification
→ User sends XM Account ID
→ Partner manually verifies
→ Partner manually sends Whop link

Target automated process:

XM Affiliate Email
→ Gmail Worker extracts XM Account ID
→ Store approved account in Supabase
→ User submits verification form
→ Backend verifies account
→ Queue fulfillment jobs
→ Worker sends WhatsApp
→ Worker sends Email
→ Audit and analytics recorded

---

## Technology Stack

### Backend

Node.js
Express
Prisma ORM
Supabase PostgreSQL
JWT Authentication
Node Cron

### Frontend

Next.js 16
TypeScript
Tailwind CSS v4
ShadCN UI
Server Components
Server Actions

### Infrastructure

Supabase
Railway
Resend
Meta WhatsApp Cloud API

---

## Required Architecture

Frontend must NEVER access database directly.

Architecture:

Next.js Dashboard
↓
Express API
↓
Prisma
↓
Supabase PostgreSQL

Workers:

Gmail Worker
Fulfillment Worker
Metrics Worker

Workers must run independently from API routes.

---

## Database Principles

1. Immutable audit trail
2. Queue-driven fulfillment
3. Campaign-driven design
4. Retryable failures
5. Dead-letter queue
6. Historical metrics

---

## Coding Standards

Every function must contain JSDoc comments.

Example:

/**
 * get_dashboard_data()
 * --------------------
 * Returns dashboard data.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * Promise<Object>
 */

No undocumented functions.

No magic values.

No business logic inside controllers.

Controllers must only:

- Validate
- Call service
- Return response

Business logic belongs in services.

Database logic belongs in services.

Workers must only orchestrate services.

---

## Folder Structure

src/

config/
controllers/
middleware/
routes/
services/
workers/
validators/
utils/

admin-dashboard/

src/
app/
components/
actions/
hooks/
lib/
types/

Prisma schema stored in:

prisma/schema.prisma