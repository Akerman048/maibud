"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";

import type { AuditLogItem } from "@/types/audit";
import type {
  CommentThreadActionState,
  CommentThreadItem,
} from "@/types/comment-thread";
import type { DocumentItem } from "@/types/document";
import type { Project } from "@/types/project";
import type { ArchiveActionState } from "@/types/archive-action";

import { ArchiveActionDialog } from "@/components/archive/ArchiveActionDialog";
import { AddCommentButton } from "@/components/comments/AddCommentButton";
import { CommentThreadsView } from "@/components/comments/CommentThreadsView";
import { DocumentPublicationActions } from "@/components/documents/DocumentPublicationActions";
import { DocumentReviewActions } from "@/components/documents/DocumentReviewActions";
import { DocumentVersions } from "@/components/documents/DocumentVersions";
import { ProjectInfoGrid } from "@/components/projects/ProjectInfoGrid";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getDocumentStatusMeta } from "@/lib/document-status";

type DocumentActionState = {
  error: string;
  success: boolean;
};

type StatefulDocumentAction = (
  previousState: DocumentActionState,
  formData: FormData,
) => Promise<DocumentActionState>;

type StatefulArchiveAction = (
  previousState: ArchiveActionState,
  formData: FormData,
) => Promise<ArchiveActionState>;

type ProjectDashboardDetailViewProps = {
  project: Project;
  documents: DocumentItem[];
  commentThreads: CommentThreadItem[];
  auditLogs?: AuditLogItem[];
  backHref: string;
  createCommentAction?: (
    previousState: CommentThreadActionState,
    formData: FormData,
  ) => Promise<CommentThreadActionState>;
  commentThreadBaseHref?: string;
  canUploadDocumentVersion?: boolean;
  canReviewDocuments?: boolean;
  canManageDocumentPublication?: boolean;
  approveDocumentAction?: StatefulDocumentAction;
  rejectDocumentAction?: StatefulDocumentAction;
  publishDocumentAction?: StatefulDocumentAction;
  unpublishDocumentAction?: StatefulDocumentAction;
  canManageArchive?: boolean;
  archiveProjectAction?: StatefulArchiveAction;
  archiveDocumentAction?: StatefulArchiveAction;
};

type ProjectTab = "overview" | "remarks" | "documents" | "journal";

const tabs: {
  label: string;
  value: ProjectTab;
}[] = [
  {
    label: "Огляд",
    value: "overview",
  },
  {
    label: "Зауваження",
    value: "remarks",
  },
  {
    label: "Документи",
    value: "documents",
  },
  {
    label: "Журнал",
    value: "journal",
  },
];

export function ProjectDashboardDetailView({
  project,
  documents,
  commentThreads,
  auditLogs = [],
  backHref,
  createCommentAction,
  commentThreadBaseHref,
  canUploadDocumentVersion = false,
  canReviewDocuments = false,
  canManageDocumentPublication = false,
  approveDocumentAction,
  rejectDocumentAction,
  publishDocumentAction,
  unpublishDocumentAction,
  canManageArchive = false,
  archiveProjectAction,
  archiveDocumentAction,
}: ProjectDashboardDetailViewProps) {
  const [activeTab, setActiveTab] = useState<ProjectTab>("overview");
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    null,
  );
  const [archiveProjectOpen, setArchiveProjectOpen] = useState(false);
  const [archiveDocumentId, setArchiveDocumentId] = useState<string | null>(null);
  const isProjectArchived = project.status === "archived";
  const documentToArchive = documents.find(({ id }) => id === archiveDocumentId);

  const selectedDocument = useMemo(
    () =>
      documents.find(
        (document) => document.id === selectedDocumentId,
      ) ?? null,
    [documents, selectedDocumentId],
  );

  function handleTabChange(tab: ProjectTab) {
    setActiveTab(tab);

    if (tab !== "documents") {
      setSelectedDocumentId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 self-start text-sm font-semibold text-[var(--color-text-secondary)] hover:text-slate-700"
      >
        <FiArrowLeft className="size-4" />
        Назад до проєктів
      </Link>

      <div className="flex min-w-0 flex-col items-stretch justify-between gap-4 sm:flex-row sm:flex-wrap sm:items-start">
        <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <h1 className="break-words text-xl font-bold tracking-[-0.01em] sm:text-2xl">
            {project.name}
          </h1>

          <Badge variant="info">{project.stage}</Badge>
          {isProjectArchived ? <Badge variant="warning">Архів</Badge> : null}
        </div>

        <p className="break-words text-[14.5px] text-[var(--color-text-secondary)]">
          {project.address}
        </p>
        </div>
        {canManageArchive && !isProjectArchived && archiveProjectAction ? (
          <Button type="button" variant="secondary" onClick={() => setArchiveProjectOpen(true)} className="w-full sm:w-auto">
            Архівувати проєкт
          </Button>
        ) : null}
      </div>

      {isProjectArchived ? (
        <div className="rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Архівний проєкт доступний лише для читання. Відновлення виконується зі сторінки архіву.
        </div>
      ) : null}

      <div className="flex overflow-x-auto border-b border-[var(--color-border)]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.value;

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleTabChange(tab.value)}
              className={`relative min-h-11 shrink-0 px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? "text-[var(--color-accent)]"
                  : "text-[var(--color-text-secondary)] hover:text-slate-700"
              }`}
            >
              {tab.label}

              {isActive && (
                <span className="absolute inset-x-0 bottom-[-1px] h-0.5 bg-[var(--color-accent)]" />
              )}
            </button>
          );
        })}
      </div>

      {activeTab === "overview" && (
        <div className="flex flex-col gap-5">
          <Card className="p-4 sm:p-6">
            <ProjectInfoGrid project={project} />
          </Card>

          <Card className="p-4 sm:p-6">
            <h2 className="mb-5 text-lg font-semibold">
              Останні оновлення
            </h2>

            {auditLogs.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)]">
                Подій поки немає.
              </p>
            ) : (
              <div className="flex flex-col">
                {auditLogs.slice(0, 3).map((log) => (
                  <div
                    key={log.id}
                    className="border-b border-[var(--color-border)] py-4 last:border-b-0"
                  >
                    <div className="font-semibold">{log.action}</div>

                    {log.documentTitle && (
                      <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                        Документ: {log.documentTitle}
                      </div>
                    )}

                    <div className="mt-1 text-sm text-[var(--color-text-muted)]">
                      {log.userName ?? "Система"} · {log.createdAt}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === "remarks" && (
        <Card className="overflow-hidden">
          <div className="border-b border-[var(--color-border)] px-5 py-4">
            <h2 className="font-semibold">Зауваження проєкту</h2>
          </div>

          <div className="p-5">
            <CommentThreadsView
              threads={commentThreads}
              detailBaseHref={commentThreadBaseHref}
            />
          </div>
        </Card>
      )}

      {activeTab === "documents" && (
        <div className="flex flex-col gap-5">
          <Card className="overflow-hidden">
            <div className="flex flex-col items-stretch justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4 sm:flex-row sm:items-center">
              <h2 className="font-semibold">Документи проєкту</h2>

              {createCommentAction && !isProjectArchived && (
                <AddCommentButton
                  projectId={project.id}
                  documents={documents}
                  createCommentAction={createCommentAction}
                />
              )}
            </div>

            {documents.length === 0 ? (
              <div className="px-5 py-6 text-sm text-[var(--color-text-secondary)]">
                Документів поки немає.
              </div>
            ) : (
              <div>
                {documents.map((document) => {
                  const isSelected =
                    document.id === selectedDocumentId;

                  return (
                    <div
                      key={document.id}
                      className={`flex flex-col justify-between gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0 lg:flex-row lg:items-start ${
                        isSelected ? "bg-slate-50" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedDocumentId((currentId) =>
                              currentId === document.id
                                ? null
                                : document.id,
                            )
                          }
                          className="min-h-11 break-words text-left font-semibold hover:text-[var(--color-accent)]"
                        >
                          {document.name}
                        </button>

                        <div className="mt-1 break-words text-sm text-[var(--color-text-secondary)]">
                          {document.type} · {document.latestVersion
                            ? `Остання версія: v${document.latestVersion}`
                            : "Версій немає"}
                        </div>

                        {document.reviewedByName && document.reviewedAt && (
                          <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                            Перевірив: {document.reviewedByName} · {document.reviewedAt}
                          </div>
                        )}

                        {document.status === "rejected" &&
                          document.rejectionReason && (
                            <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                              <span className="font-semibold">
                                Причина відхилення:
                              </span>{" "}
                              {document.rejectionReason}
                            </div>
                          )}
                      </div>

                      <div className="flex w-full shrink-0 flex-col items-stretch gap-3 lg:w-auto lg:items-end">
                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                          {document.isPublishedToClient && (
                            <Badge variant="success">Для клієнта</Badge>
                          )}

                          <Badge
                            variant={
                              getDocumentStatusMeta(document.status)
                                .variant
                            }
                          >
                            {getDocumentStatusMeta(document.status).label}
                          </Badge>
                        </div>

                        {canReviewDocuments &&
                          !isProjectArchived &&
                          document.status === "submitted" &&
                          approveDocumentAction &&
                          rejectDocumentAction && (
                            <DocumentReviewActions
                              documentId={document.id}
                              documentName={document.name}
                              approveAction={approveDocumentAction}
                              rejectAction={rejectDocumentAction}
                            />
                          )}

                        {canManageDocumentPublication &&
                          !isProjectArchived &&
                          publishDocumentAction &&
                          unpublishDocumentAction && (
                            <DocumentPublicationActions
                              document={document}
                              publishAction={publishDocumentAction}
                              unpublishAction={unpublishDocumentAction}
                            />
                          )}

                        {canManageArchive &&
                        !isProjectArchived &&
                        archiveDocumentAction &&
                        (document.status === "approved" ||
                          document.status === "rejected") ? (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setArchiveDocumentId(document.id)}
                          >
                            Архівувати документ
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {selectedDocument && (
            <DocumentVersions
              key={selectedDocument.id}
              documentId={selectedDocument.id}
              documentName={selectedDocument.name}
              canUpload={canUploadDocumentVersion && !isProjectArchived}
              documentStatus={selectedDocument.status}
            />
          )}
        </div>
      )}

      {activeTab === "journal" && (
        <Card className="p-4 sm:p-6">
          <h2 className="mb-5 text-lg font-semibold">Журнал подій</h2>

          {auditLogs.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">
              Подій поки немає.
            </p>
          ) : (
            <div className="flex flex-col">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="border-b border-[var(--color-border)] py-5 last:border-b-0"
                >
                  <div className="font-semibold">
                    {log.userName ? `${log.userName}: ` : ""}
                    {log.action}
                  </div>

                  {log.documentTitle && (
                    <div className="mt-2 text-sm text-[var(--color-text-secondary)]">
                      Документ: {log.documentTitle}
                    </div>
                  )}

                  {log.commentText && (
                    <p className="mt-2 line-clamp-2 text-sm text-[var(--color-text-secondary)]">
                      «{log.commentText}»
                    </p>
                  )}

                  <div className="mt-3 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <span className="text-sm text-[var(--color-text-muted)]">
                      {log.createdAt}
                    </span>

                    {["COMMENT", "COMMENT_THREAD", "COMMENT_MESSAGE"].includes(
                      log.entityType,
                    ) && (
                      <button
                        type="button"
                        onClick={() => handleTabChange("remarks")}
                        className="text-sm font-semibold text-[var(--color-accent)] hover:underline"
                      >
                        Перейти до зауважень
                      </button>
                    )}

                    {log.entityType === "DOCUMENT" && (
                      <button
                        type="button"
                        onClick={() => handleTabChange("documents")}
                        className="text-sm font-semibold text-[var(--color-accent)] hover:underline"
                      >
                        Відкрити документи
                      </button>
                    )}

                    {log.entityType === "PROJECT" && (
                      <button
                        type="button"
                        onClick={() => handleTabChange("overview")}
                        className="text-sm font-semibold text-[var(--color-accent)] hover:underline"
                      >
                        Відкрити огляд
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {archiveProjectOpen && archiveProjectAction ? (
        <ArchiveActionDialog
          action={archiveProjectAction}
          entity="project"
          entityId={project.id}
          entityName={project.name}
          mode="archive"
          onClose={() => setArchiveProjectOpen(false)}
        />
      ) : null}
      {documentToArchive && archiveDocumentAction ? (
        <ArchiveActionDialog
          action={archiveDocumentAction}
          entity="document"
          entityId={documentToArchive.id}
          entityName={documentToArchive.name}
          mode="archive"
          onClose={() => setArchiveDocumentId(null)}
        />
      ) : null}
    </div>
  );
}
