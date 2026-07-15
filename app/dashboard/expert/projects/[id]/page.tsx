import { notFound } from "next/navigation";

import { UserRole } from "@/app/generated/prisma/client";
import { createCommentThread } from "@/app/dashboard/comment-thread-actions";
import { getProjectAuditLogs } from "@/lib/audit";
import { getProjectById } from "@/lib/projects";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProjectDashboardDetailView } from "@/components/projects/ProjectDashboardDetailView";
import { getDocumentsByProjectId } from "@/lib/documents";
import { requireRole } from "@/lib/auth-guard";
import { getCommentThreadsByProjectId } from "@/lib/comment-threads";
import {
  approveDocument,
  rejectDocument,
} from "./actions";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ExpertProjectDetailPage({ params }: PageProps) {
  const { id } = await params;
  const currentUser = await requireRole([UserRole.EXPERT]);

  const [project, documents, commentThreads, auditLogs] = await Promise.all([
    getProjectById(id),
    getDocumentsByProjectId(id),
    getCommentThreadsByProjectId(id, currentUser.id, currentUser.role),
    getProjectAuditLogs(id),
  ]);

  if (!project) {
    notFound();
  }

  return (
    <DashboardLayout>
      <ProjectDashboardDetailView
        project={project}
        documents={documents}
        commentThreads={commentThreads}
        auditLogs={auditLogs}
        backHref="/dashboard/expert"
        createCommentAction={createCommentThread}
        commentThreadBaseHref="/dashboard/expert/comments"
        canReviewDocuments
        approveDocumentAction={approveDocument}
        rejectDocumentAction={rejectDocument}
      />
    </DashboardLayout>
  );
}
