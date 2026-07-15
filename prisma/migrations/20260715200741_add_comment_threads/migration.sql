-- CreateEnum
CREATE TYPE "CommentThreadStatus" AS ENUM ('OPEN', 'RESOLVED', 'RETURNED');

-- CreateTable
CREATE TABLE "CommentThread" (
    "id" TEXT NOT NULL,
    "status" "CommentThreadStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT,
    "section" TEXT,
    "documentId" TEXT NOT NULL,
    "documentVersionId" TEXT,
    "createdById" TEXT NOT NULL,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "legacyCommentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommentThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentMessage" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommentMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommentThread_legacyCommentId_key" ON "CommentThread"("legacyCommentId");

-- CreateIndex
CREATE INDEX "CommentThread_documentId_status_createdAt_idx" ON "CommentThread"("documentId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "CommentThread_documentVersionId_createdAt_idx" ON "CommentThread"("documentVersionId", "createdAt");

-- CreateIndex
CREATE INDEX "CommentThread_createdById_createdAt_idx" ON "CommentThread"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "CommentMessage_threadId_createdAt_idx" ON "CommentMessage"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "CommentMessage_authorId_createdAt_idx" ON "CommentMessage"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "CommentMessage_deletedAt_idx" ON "CommentMessage"("deletedAt");

-- AddForeignKey
ALTER TABLE "CommentThread" ADD CONSTRAINT "CommentThread_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentThread" ADD CONSTRAINT "CommentThread_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "DocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentThread" ADD CONSTRAINT "CommentThread_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentThread" ADD CONSTRAINT "CommentThread_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentMessage" ADD CONSTRAINT "CommentMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "CommentThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentMessage" ADD CONSTRAINT "CommentMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentMessage" ADD CONSTRAINT "CommentMessage_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
