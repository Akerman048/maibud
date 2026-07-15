-- CreateEnum
CREATE TYPE "EmailJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EmailTemplate" AS ENUM ('INVITATION_CREATED', 'INVITATION_ACCEPTED', 'DOCUMENT_SUBMITTED', 'DOCUMENT_VERSION_UPLOADED', 'DOCUMENT_APPROVED', 'DOCUMENT_REJECTED', 'DOCUMENT_PUBLISHED', 'COMMENT_THREAD_CREATED', 'COMMENT_REPLY_CREATED', 'COMMENT_THREAD_RESOLVED', 'COMMENT_THREAD_RETURNED', 'PROJECT_MEMBER_ADDED', 'PROJECT_MEMBER_REMOVED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailCommentUpdates" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailDocumentUpdates" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailMembershipUpdates" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "EmailJob" (
    "id" TEXT NOT NULL,
    "template" "EmailTemplate" NOT NULL,
    "status" "EmailJobStatus" NOT NULL DEFAULT 'PENDING',
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT,
    "subject" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "providerMessageId" TEXT,
    "notificationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailJob_status_nextAttemptAt_createdAt_idx" ON "EmailJob"("status", "nextAttemptAt", "createdAt");

-- CreateIndex
CREATE INDEX "EmailJob_recipientEmail_createdAt_idx" ON "EmailJob"("recipientEmail", "createdAt");

-- CreateIndex
CREATE INDEX "EmailJob_notificationId_idx" ON "EmailJob"("notificationId");

-- AddForeignKey
ALTER TABLE "EmailJob" ADD CONSTRAINT "EmailJob_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE SET NULL ON UPDATE CASCADE;
