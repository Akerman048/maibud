"use client";

import { useState } from "react";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";

import type { Project } from "@/types/project";

import type { CommentItem } from "@/types/comment";
import type { DocumentItem } from "@/types/document";

import { AddCommentButton } from "@/components/comments/AddCommentButton";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ProjectInfoGrid } from "@/components/projects/ProjectInfoGrid";
import { ProjectTimeline } from "@/components/projects/ProjectTimeline";

type ProjectDashboardDetailViewProps = {
  project: Project;
  documents: DocumentItem[];
  comments: CommentItem[];
  backHref: string;
  createCommentAction?: (formData: FormData) => Promise<void>;
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
  comments,
  backHref,
  createCommentAction,
}: ProjectDashboardDetailViewProps) {
  const [activeTab, setActiveTab] = useState<ProjectTab>("overview");

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 self-start text-sm font-semibold text-[var(--color-text-secondary)] hover:text-slate-700"
      >
        <FiArrowLeft className="size-4" />
        Назад до проєктів
      </Link>

      <div>
        <div className="mb-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-[-0.01em]">
            {project.name}
          </h1>

          <Badge variant="info">{project.stage}</Badge>
        </div>

        <p className="text-[14.5px] text-[var(--color-text-secondary)]">
          {project.address}
        </p>
      </div>

      <div className="flex overflow-x-auto border-b border-[var(--color-border)]">
        {" "}
        {tabs.map((tab) => {
          const isActive = activeTab === tab.value;

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                console.log("tab clicked", tab.value);
                setActiveTab(tab.value);
              }}
              className={`relative shrink-0 px-4 py-3 text-sm font-semibold transition ${
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
          <Card className="p-6">
            <ProjectInfoGrid project={project} />
          </Card>

          <Card className="p-6">
            <h2 className="mb-5 text-lg font-semibold">Останні оновлення</h2>

            <ProjectTimeline />
          </Card>
        </div>
      )}

      {activeTab === "remarks" && (
        <Card className="overflow-hidden">
          <div className="border-b border-[var(--color-border)] px-5 py-4">
            <h2 className="font-semibold">Зауваження проєкту</h2>
          </div>

          <div>
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="border-b border-slate-100 px-5 py-4 last:border-b-0"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold">{comment.section}</div>

                    <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                      {comment.text}
                    </p>
                  </div>

                  <Badge
                    variant={
                      comment.status === "resolved"
                        ? "success"
                        : comment.status === "returned"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {comment.status === "open"
                      ? "Відкрите"
                      : comment.status === "resolved"
                        ? "Відпрацьоване"
                        : "Повернено"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === "documents" && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4">
            <h2 className="font-semibold">Документи проєкту</h2>

            {createCommentAction && (
              <AddCommentButton
                projectId={project.id}
                documents={documents}
                createCommentAction={createCommentAction}
              />
            )}
          </div>

          <div>
            {documents.map((document) => (
              <div
                key={document.id}
                className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0"
              >
                <div>
                  <div className="font-semibold">{document.name}</div>

                  <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    {document.type}
                  </div>
                </div>

                <Badge
                  variant={
                    document.status === "approved"
                      ? "success"
                      : document.status === "submitted"
                        ? "info"
                        : document.status === "rejected"
                          ? "danger"
                          : "warning"
                  }
                >
                  {document.status === "draft"
                    ? "Чернетка"
                    : document.status === "submitted"
                      ? "На перевірці"
                      : document.status === "approved"
                        ? "Готово"
                        : document.status === "rejected"
                          ? "Відхилено"
                          : "Архів"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === "journal" && (
        <Card className="p-6">
          <h2 className="mb-5 text-lg font-semibold">Журнал подій</h2>

          <ProjectTimeline />
        </Card>
      )}
    </div>
  );
}
