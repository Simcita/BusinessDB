-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "FulfillmentType" AS ENUM ('WHATSAPP', 'EMAIL');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "xm_approved_accounts" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "emailSubject" TEXT,
    "senderEmail" TEXT,
    "rawEmailExcerpt" TEXT,
    "parsedSuccessfully" BOOLEAN NOT NULL DEFAULT true,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xm_approved_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_submissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "xmAccountId" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "verificationAttempts" INTEGER NOT NULL DEFAULT 1,
    "ipAddress" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fulfilledAt" TIMESTAMP(3),

    CONSTRAINT "user_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fulfillment_logs" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "fulfillmentType" "FulfillmentType" NOT NULL,
    "deliveryStatus" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "providerResponse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fulfillment_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "xm_approved_accounts_accountId_key" ON "xm_approved_accounts"("accountId");

-- CreateIndex
CREATE INDEX "user_submissions_email_idx" ON "user_submissions"("email");

-- CreateIndex
CREATE INDEX "user_submissions_phone_idx" ON "user_submissions"("phone");

-- CreateIndex
CREATE INDEX "user_submissions_status_idx" ON "user_submissions"("status");

-- AddForeignKey
ALTER TABLE "user_submissions" ADD CONSTRAINT "user_submissions_xmAccountId_fkey" FOREIGN KEY ("xmAccountId") REFERENCES "xm_approved_accounts"("accountId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfillment_logs" ADD CONSTRAINT "fulfillment_logs_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "user_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
