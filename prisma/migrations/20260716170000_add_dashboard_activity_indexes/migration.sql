-- AddIndex
CREATE INDEX "Document_projectId_status_reviewedAt_idx" ON "Document"("projectId", "status", "reviewedAt");

-- AddIndex
CREATE INDEX "Document_authorId_status_idx" ON "Document"("authorId", "status");

-- AddIndex
CREATE INDEX "DocumentVersion_createdById_createdAt_idx" ON "DocumentVersion"("createdById", "createdAt");

-- AddIndex
CREATE INDEX "CommentThread_createdById_status_idx" ON "CommentThread"("createdById", "status");

-- AddIndex
CREATE INDEX "AuditLog_projectId_createdAt_idx" ON "AuditLog"("projectId", "createdAt");

-- AddIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- AddIndex
CREATE INDEX "AuditLog_entityType_createdAt_idx" ON "AuditLog"("entityType", "createdAt");
