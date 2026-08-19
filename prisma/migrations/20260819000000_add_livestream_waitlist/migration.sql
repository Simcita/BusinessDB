-- ============================================================
-- Migration: add_livestream_waitlist
-- ------------------------------------------------------------
-- Adds a standalone LivestreamWaitlistEntry table for the
-- livestream-seminar waitlist feature. Fully additive — does
-- not touch UserSubmission, FulfillmentJob, or any existing
-- table. Hand-written and applied via `prisma migrate resolve`
-- rather than `prisma migrate dev`, to avoid Prisma's automatic
-- drift-reconciliation touching pre-existing, unrelated drift
-- in this database (an orphaned column on user_submissions and
-- an unrelated `submissions` table) that is out of scope here.
-- ============================================================

-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "livestream_waitlist_entries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "xmAccountId" TEXT NOT NULL,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'PENDING',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "livestream_waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "livestream_waitlist_entries_email_key" ON "livestream_waitlist_entries"("email");

-- CreateIndex
CREATE INDEX "livestream_waitlist_entries_status_idx" ON "livestream_waitlist_entries"("status");
