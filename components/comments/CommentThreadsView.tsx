"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type {
  CommentThreadItem,
  CommentThreadStatusValue,
} from "@/types/comment-thread";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

type ThreadFilter = "all" | CommentThreadStatusValue;

type CommentThreadsViewProps = {
  threads: CommentThreadItem[];
  detailBaseHref?: string;
};

const filters: { label: string; value: ThreadFilter }[] = [
  { label: "Усі", value: "all" },
  { label: "Відкриті", value: "open" },
  { label: "Виконані", value: "resolved" },
  { label: "Повернені", value: "returned" },
];

export function getCommentThreadStatusLabel(
  status: CommentThreadStatusValue,
) {
  if (status === "resolved") return "Виконано";
  if (status === "returned") return "Повернено";

  return "Відкрите";
}

function getStatusVariant(status: CommentThreadStatusValue) {
  if (status === "resolved") return "success";
  if (status === "returned") return "danger";

  return "warning";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("uk-UA", { timeZone: "UTC" });
}

export function CommentThreadsView({
  threads,
  detailBaseHref,
}: CommentThreadsViewProps) {
  const [filter, setFilter] = useState<ThreadFilter>("all");
  const filteredThreads = useMemo(
    () =>
      filter === "all"
        ? threads
        : threads.filter((thread) => thread.status === filter),
    [filter, threads],
  );

  if (threads.length === 0) {
    return (
      <EmptyState
        title="Зауважень немає"
        description="Нові обговорення документів зʼявляться тут."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <Button
            key={item.value}
            type="button"
            variant={filter === item.value ? "primary" : "secondary"}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {filteredThreads.length === 0 ? (
        <EmptyState
          title="Немає зауважень із таким статусом"
          description="Оберіть інший фільтр."
        />
      ) : (
        <div className="grid gap-4">
          {filteredThreads.map((thread) => {
            const lastMessage = thread.messages.at(-1);

            return (
              <Card key={thread.id} className="p-5">
                <div className="flex flex-col justify-between gap-5 md:flex-row">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">
                        {thread.title ?? thread.documentTitle}
                      </h3>
                      <Badge variant={getStatusVariant(thread.status)}>
                        {getCommentThreadStatusLabel(thread.status)}
                      </Badge>
                    </div>

                    <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                      {thread.projectName} · {thread.documentTitle}
                      {thread.version ? ` · v${thread.version}` : ""}
                    </div>

                    {thread.section && (
                      <div className="mt-2 text-sm font-medium">
                        Розділ: {thread.section}
                      </div>
                    )}

                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                      {lastMessage?.content ?? "Повідомлення видалено"}
                    </p>

                    <div className="mt-3 text-xs text-[var(--color-text-muted)]">
                      Повідомлень: {thread.messages.length} · Оновлено {formatDate(thread.updatedAt)}
                    </div>
                  </div>

                  {detailBaseHref && (
                    <Button asChild variant="secondary" className="shrink-0 self-start">
                      <Link href={`${detailBaseHref}/${thread.id}`}>
                        Відкрити обговорення
                      </Link>
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
