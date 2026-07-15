-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DOCUMENT_SUBMITTED', 'DOCUMENT_VERSION_UPLOADED', 'DOCUMENT_APPROVED', 'DOCUMENT_REJECTED', 'DOCUMENT_PUBLISHED', 'DOCUMENT_UNPUBLISHED', 'COMMENT_THREAD_CREATED', 'COMMENT_REPLY_CREATED', 'COMMENT_THREAD_RESOLVED', 'COMMENT_THREAD_RETURNED', 'PROJECT_MEMBER_ADDED', 'PROJECT_MEMBER_REMOVED', 'INVITATION_ACCEPTED', 'PROJECT_ARCHIVED', 'PROJECT_RESTORED');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT,
    "userId" TEXT NOT NULL,
    "actorId" TEXT,
    "projectId" TEXT,
    "documentId" TEXT,
    "commentThreadId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_projectId_createdAt_idx" ON "Notification"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_documentId_createdAt_idx" ON "Notification"("documentId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_commentThreadId_createdAt_idx" ON "Notification"("commentThreadId", "createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_commentThreadId_fkey" FOREIGN KEY ("commentThreadId") REFERENCES "CommentThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
