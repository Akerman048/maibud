-- AddIndex
CREATE INDEX "Project_status_createdAt_idx" ON "Project"("status", "createdAt");

-- AddIndex
CREATE INDEX "Project_organizationId_status_createdAt_idx" ON "Project"("organizationId", "status", "createdAt");

-- AddIndex
CREATE INDEX "Project_archivedAt_idx" ON "Project"("archivedAt");

-- AddIndex
CREATE INDEX "Project_deadline_idx" ON "Project"("deadline");

-- AddIndex
CREATE INDEX "OrganizationMember_userId_removedAt_idx" ON "OrganizationMember"("userId", "removedAt");

-- AddIndex
CREATE INDEX "OrganizationMember_organizationId_role_removedAt_idx" ON "OrganizationMember"("organizationId", "role", "removedAt");

-- AddIndex
CREATE INDEX "ProjectMember_projectId_role_idx" ON "ProjectMember"("projectId", "role");

-- AddIndex
CREATE INDEX "ProjectMember_userId_role_idx" ON "ProjectMember"("userId", "role");

-- AddIndex
CREATE INDEX "Document_projectId_status_createdAt_idx" ON "Document"("projectId", "status", "createdAt");

-- AddIndex
CREATE INDEX "Document_authorId_createdAt_idx" ON "Document"("authorId", "createdAt");

-- AddIndex
CREATE INDEX "Document_reviewedById_reviewedAt_idx" ON "Document"("reviewedById", "reviewedAt");

-- AddIndex
CREATE INDEX "Document_isPublishedToClient_status_idx" ON "Document"("isPublishedToClient", "status");

-- AddIndex
CREATE INDEX "Document_archivedAt_idx" ON "Document"("archivedAt");

-- AddIndex
CREATE INDEX "CommentThread_documentId_status_updatedAt_idx" ON "CommentThread"("documentId", "status", "updatedAt");

-- AddIndex
CREATE INDEX "Notification_userId_type_createdAt_idx" ON "Notification"("userId", "type", "createdAt");
