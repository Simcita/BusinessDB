-- ============================================================
-- Migration: async_verification
-- ------------------------------------------------------------
-- Decouples UserSubmission creation from XmApprovedAccount
-- existence so users can submit before the affiliate email
-- arrives in the inbox.
--
-- Prisma keeps camelCase column names by default (no @map),
-- so the column is "xmAccountId" not "xm_account_id".
--
-- Changes:
--   1. Add "submittedAccountId" (plain string, no FK) to store
--      exactly what the user typed at submission time.
--   2. Backfill "submittedAccountId" from "xmAccountId" for
--      all existing rows before enforcing NOT NULL.
--   3. Make "xmAccountId" nullable — only populated by the
--      verification cron once the account is confirmed.
--   4. Add a conditional unique index to prevent two
--      PENDING or VERIFIED rows for the same account ID.
--   5. Add a regular index for the cron batch query.
-- ============================================================


-- Step 1: Add the new column as nullable first so existing
--         rows don't violate NOT NULL during the ALTER.

ALTER TABLE "user_submissions"
  ADD COLUMN "submittedAccountId" TEXT;


-- Step 2: Backfill from the existing "xmAccountId" column.
--         Every pre-existing row had a valid non-null
--         "xmAccountId" so this covers all existing data.

UPDATE "user_submissions"
  SET "submittedAccountId" = "xmAccountId";


-- Step 3: Enforce NOT NULL now that all rows are backfilled.

ALTER TABLE "user_submissions"
  ALTER COLUMN "submittedAccountId" SET NOT NULL;


-- Step 4: Make "xmAccountId" nullable.
--         NULL values do not violate the existing FK constraint
--         in PostgreSQL, so the foreign key is preserved for
--         VERIFIED rows while PENDING rows can have null.

ALTER TABLE "user_submissions"
  ALTER COLUMN "xmAccountId" DROP NOT NULL;


-- Step 5: Conditional unique index — only one PENDING or
--         VERIFIED row per submittedAccountId is allowed.
--         FAILED and DUPLICATE rows are excluded so a user
--         can re-submit after a failure.

CREATE UNIQUE INDEX "user_submissions_active_claim_unique"
  ON "user_submissions" ("submittedAccountId")
  WHERE (status IN ('PENDING', 'VERIFIED'));


-- Step 6: Regular index for the cron worker batch query.

CREATE INDEX "user_submissions_submittedAccountId_idx"
  ON "user_submissions" ("submittedAccountId");
