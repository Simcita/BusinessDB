-- =============================================================
-- MIGRATION: production_hardening
-- -------------------------------------------------------------
-- Applies to: database left in state after
--   20260531193737_init
--   20260531230033_architecture_upgrade
--   20260531231308_observability_layer
--
-- Changes in this migration:
--   1.  Create ParsingStatus enum and migrate parser_logs
--   2.  Add updatedAt to mutable entity tables
--   3.  Add soft-delete (deletedAt) to campaigns and templates
--   4.  Add performedBy to audit_logs
--   5.  Add every missing index for 100k+ row performance
-- =============================================================


-- =============================================================
-- STEP 1: Create ParsingStatus enum
-- -------------------------------------------------------------
-- Replaces the unconstrained TEXT column in parser_logs with
-- a proper enum so only valid values can be stored.
-- The USING clause handles the in-place data migration for
-- existing rows whose values must already be one of the two
-- valid enum members or NULL.
-- =============================================================

CREATE TYPE "ParsingStatus" AS ENUM ('SUCCESS', 'FAILED');

-- Migrate existing string values to the new enum type.
-- Unrecognised values (should not exist) are cast to NULL
-- rather than failing the migration.
ALTER TABLE "parser_logs"
  ALTER COLUMN "parsingStatus" TYPE "ParsingStatus"
  USING CASE
    WHEN "parsingStatus" = 'SUCCESS' THEN 'SUCCESS'::"ParsingStatus"
    WHEN "parsingStatus" = 'FAILED'  THEN 'FAILED'::"ParsingStatus"
    ELSE NULL
  END;


-- =============================================================
-- STEP 2: Add updatedAt to all mutable entity tables
-- -------------------------------------------------------------
-- Prisma's @updatedAt marks the column for automatic update
-- at the ORM layer. The DEFAULT CURRENT_TIMESTAMP backfills
-- existing rows so the NOT NULL constraint is satisfied.
-- The default is dropped after backfill to ensure Prisma
-- remains the only writer of this value.
-- =============================================================

-- admin_users
ALTER TABLE "admin_users"
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "admin_users"
  ALTER COLUMN "updatedAt" DROP DEFAULT;

-- user_submissions
ALTER TABLE "user_submissions"
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "user_submissions"
  ALTER COLUMN "updatedAt" DROP DEFAULT;

-- fulfillment_jobs
ALTER TABLE "fulfillment_jobs"
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "fulfillment_jobs"
  ALTER COLUMN "updatedAt" DROP DEFAULT;

-- campaigns
ALTER TABLE "campaigns"
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "campaigns"
  ALTER COLUMN "updatedAt" DROP DEFAULT;

-- notification_templates
ALTER TABLE "notification_templates"
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "notification_templates"
  ALTER COLUMN "updatedAt" DROP DEFAULT;


-- =============================================================
-- STEP 3: Add soft-delete (deletedAt) columns
-- -------------------------------------------------------------
-- Campaigns and notification templates that have linked data
-- cannot be hard-deleted without violating referential
-- integrity. Soft-delete via deletedAt is the safe path.
-- Service queries must always include WHERE deletedAt IS NULL.
-- =============================================================

ALTER TABLE "campaigns"
  ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "notification_templates"
  ADD COLUMN "deletedAt" TIMESTAMP(3);


-- =============================================================
-- STEP 4: Add performedBy to audit_logs
-- -------------------------------------------------------------
-- Records the UUID of the admin who triggered the event, or
-- the literal string "SYSTEM" for automated worker events.
-- Nullable to maintain backward compatibility with existing rows.
-- =============================================================

ALTER TABLE "audit_logs"
  ADD COLUMN "performedBy" TEXT;


-- =============================================================
-- STEP 5: Add missing indexes
-- =============================================================

-- -------------------------
-- user_submissions
-- -------------------------
-- xmAccountId: primary lookup during verification
CREATE INDEX "user_submissions_xmAccountId_idx"
  ON "user_submissions"("xmAccountId");

-- submittedAt: ordered listing and date-range dashboard filters
CREATE INDEX "user_submissions_submittedAt_idx"
  ON "user_submissions"("submittedAt");


-- -------------------------
-- fulfillment_logs
-- -------------------------
-- submissionId: all logs for a given submission
-- (PostgreSQL FK constraints do not auto-create indexes)
CREATE INDEX "fulfillment_logs_submissionId_idx"
  ON "fulfillment_logs"("submissionId");

-- deliveryStatus: filter SUCCESS / FAILED on the jobs page
CREATE INDEX "fulfillment_logs_deliveryStatus_idx"
  ON "fulfillment_logs"("deliveryStatus");

-- createdAt: ordered listing
CREATE INDEX "fulfillment_logs_createdAt_idx"
  ON "fulfillment_logs"("createdAt");


-- -------------------------
-- fulfillment_jobs
-- -------------------------
-- submissionId: join and per-submission job queries
CREATE INDEX "fulfillment_jobs_submissionId_idx"
  ON "fulfillment_jobs"("submissionId");

-- createdAt: ordered listing on the jobs dashboard page
CREATE INDEX "fulfillment_jobs_createdAt_idx"
  ON "fulfillment_jobs"("createdAt");


-- -------------------------
-- failed_jobs
-- -------------------------
-- notificationChannel: filter by WHATSAPP / EMAIL
CREATE INDEX "failed_jobs_notificationChannel_idx"
  ON "failed_jobs"("notificationChannel");

-- originalJobId: look up the source FulfillmentJob record
CREATE INDEX "failed_jobs_originalJobId_idx"
  ON "failed_jobs"("originalJobId");


-- -------------------------
-- campaigns
-- -------------------------
-- isActive: active-only campaign queries
CREATE INDEX "campaigns_isActive_idx"
  ON "campaigns"("isActive");

-- createdAt: ordered listing
CREATE INDEX "campaigns_createdAt_idx"
  ON "campaigns"("createdAt");

-- deletedAt: fast WHERE deletedAt IS NULL exclusion
CREATE INDEX "campaigns_deletedAt_idx"
  ON "campaigns"("deletedAt");


-- -------------------------
-- notification_templates
-- -------------------------
-- notificationType: filter by WHATSAPP / EMAIL channel
CREATE INDEX "notification_templates_notificationType_idx"
  ON "notification_templates"("notificationType");

-- isActive: active-only template queries
CREATE INDEX "notification_templates_isActive_idx"
  ON "notification_templates"("isActive");

-- deletedAt: fast WHERE deletedAt IS NULL exclusion
CREATE INDEX "notification_templates_deletedAt_idx"
  ON "notification_templates"("deletedAt");


-- -------------------------
-- parser_logs
-- -------------------------
-- parsingStatus: filter FAILED parses on the parser page
CREATE INDEX "parser_logs_parsingStatus_idx"
  ON "parser_logs"("parsingStatus");

-- createdAt: ordered listing and date-range filters
CREATE INDEX "parser_logs_createdAt_idx"
  ON "parser_logs"("createdAt");


-- -------------------------
-- audit_logs
-- -------------------------
-- entityId: all audit events for a specific record
CREATE INDEX "audit_logs_entityId_idx"
  ON "audit_logs"("entityId");

-- performedBy: all actions by a specific admin
CREATE INDEX "audit_logs_performedBy_idx"
  ON "audit_logs"("performedBy");

-- createdAt: ordered listing and date-range filters
CREATE INDEX "audit_logs_createdAt_idx"
  ON "audit_logs"("createdAt");


-- -------------------------
-- xm_approved_accounts
-- -------------------------
-- fetchedAt: ordered listing on the accounts dashboard page
CREATE INDEX "xm_approved_accounts_fetchedAt_idx"
  ON "xm_approved_accounts"("fetchedAt");

-- parsedSuccessfully: quick aggregate of parser failure rate
CREATE INDEX "xm_approved_accounts_parsedSuccessfully_idx"
  ON "xm_approved_accounts"("parsedSuccessfully");


-- =============================================================
-- MIGRATION COMPLETE
-- =============================================================
