-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('WHATSAPP', 'EMAIL');

-- AlterTable
ALTER TABLE "user_submissions" ADD COLUMN     "campaignId" TEXT;

-- CreateTable
CREATE TABLE "parser_logs" (
    "id" TEXT NOT NULL,
    "emailSubject" TEXT,
    "senderEmail" TEXT,
    "parsingStatus" TEXT,
    "extractedAccountId" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parser_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "campaignName" TEXT NOT NULL,
    "brokerName" TEXT NOT NULL,
    "whopLink" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fulfillment_jobs" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "notificationChannel" "NotificationChannel" NOT NULL,
    "jobStatus" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fulfillment_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "notificationType" "NotificationChannel" NOT NULL,
    "subjectLine" TEXT,
    "templateBody" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventDescription" TEXT NOT NULL,
    "entityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_campaignName_key" ON "campaigns"("campaignName");

-- CreateIndex
CREATE INDEX "fulfillment_jobs_jobStatus_idx" ON "fulfillment_jobs"("jobStatus");

-- CreateIndex
CREATE INDEX "fulfillment_jobs_scheduledFor_idx" ON "fulfillment_jobs"("scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_templateName_key" ON "notification_templates"("templateName");

-- CreateIndex
CREATE INDEX "audit_logs_eventType_idx" ON "audit_logs"("eventType");

-- AddForeignKey
ALTER TABLE "user_submissions" ADD CONSTRAINT "user_submissions_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfillment_jobs" ADD CONSTRAINT "fulfillment_jobs_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "user_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
