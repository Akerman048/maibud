"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { FiBell } from "react-icons/fi";

import type {
  NotificationActionState,
  NotificationFilter,
  NotificationPage,
} from "@/types/notification";
import { NotificationLink } from "@/components/notifications/NotificationLink";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/search/Pagination";

type MarkReadAction = (
  previousState: NotificationActionState,
  formData: FormData,
) => Promise<NotificationActionState>;

type NotificationsViewProps = {
  data: NotificationPage;
  filter: NotificationFilter;
  basePath: string;
  markReadAction: MarkReadAction;
  markAllReadAction: () => Promise<NotificationActionState>;
};

const filters: { label: string; value: NotificationFilter }[] = [
  { label: "Усі", value: "all" },
  { label: "Непрочитані", value: "unread" },
  { label: "Прочитані", value: "read" },
];

export function NotificationsView({
  data,
  filter,
  basePath,
  markReadAction,
  markAllReadAction,
}: NotificationsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const filterHref = (nextFilter: NotificationFilter) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("filter", nextFilter); params.set("page", "1");
    return `${basePath}?${params.toString()}`;
  };

  function markAllRead() {
    startTransition(async () => {
      const state = await markAllReadAction();
      setMessage(state.error || "Усі сповіщення позначено прочитаними.");
      if (state.success) router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
          {filters.map((item) => (
            <Button
              key={item.value}
              asChild
              variant={filter === item.value ? "primary" : "secondary"}
            >
              <Link href={filterHref(item.value)}>
                {item.label}
              </Link>
            </Button>
          ))}
        </div>

        <Button
          type="button"
          variant="secondary"
          disabled={isPending || data.unreadCount === 0}
          onClick={markAllRead}
          className="w-full sm:w-auto"
        >
          {isPending ? "Оновлення…" : "Позначити всі прочитаними"}
        </Button>
      </div>

      {message && <p role="status" className="text-sm">{message}</p>}

      {data.items.length === 0 ? (
        <EmptyState
          title="Сповіщень немає"
          description="Нові персональні події зʼявляться тут."
        />
      ) : (
        <div className="grid gap-4">
          {data.items.map((item) => (
            <Card
              key={item.id}
              className={`p-5 ${item.isRead ? "" : "border-blue-200 bg-blue-50/30"}`}
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[var(--color-accent)]">
                    <FiBell className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-words font-semibold">{item.title}</h3>
                      {!item.isRead && <Badge variant="info">Нове</Badge>}
                    </div>
                    <p className="mt-2 break-words text-sm text-[var(--color-text-secondary)]">
                      {item.message}
                    </p>
                    <div className="mt-3 break-words text-xs text-[var(--color-text-muted)]">
                      {item.actorName ? `Від: ${item.actorName} · ` : ""}
                      {item.projectName ? `${item.projectName} · ` : ""}
                      {new Date(item.createdAt).toLocaleString("uk-UA", { timeZone: "UTC" })}
                    </div>
                  </div>
                </div>

                <NotificationLink
                  notificationId={item.id}
                  href={item.href}
                  action={markReadAction}
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Pagination pagination={{ page: data.page, pageSize: data.pageSize, total: data.total, totalPages: data.totalPages, hasNextPage: data.page < data.totalPages, hasPreviousPage: data.page > 1 }} />
    </div>
  );
}
