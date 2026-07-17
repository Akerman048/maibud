"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FiArrowLeft } from "react-icons/fi";

import type { UserRole } from "@/app/generated/prisma/client";
import type {
  CommentThreadActionState,
  CommentThreadItem,
} from "@/types/comment-thread";
import { getCommentThreadStatusLabel } from "@/components/comments/CommentThreadsView";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";

type ThreadAction = (
  previousState: CommentThreadActionState,
  formData: FormData,
) => Promise<CommentThreadActionState>;

type CommentThreadDetailProps = {
  thread: CommentThreadItem;
  role: UserRole;
  backHref: string;
  replyAction: ThreadAction;
  resolveAction: ThreadAction;
  returnAction: ThreadAction;
  deleteMessageAction: ThreadAction;
};

const initialState: CommentThreadActionState = {
  error: "",
  success: false,
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("uk-UA", { timeZone: "UTC" });
}

function statusVariant(status: CommentThreadItem["status"]) {
  if (status === "resolved") return "success";
  if (status === "returned") return "danger";
  return "warning";
}

function ActionMessage({ state }: { state: CommentThreadActionState }) {
  if (!state.error && !state.success) return null;

  return (
    <p
      role={state.error ? "alert" : "status"}
      className={`text-sm ${
        state.error ? "text-[var(--color-danger)]" : "text-[var(--color-success)]"
      }`}
    >
      {state.error || "Зміни збережено."}
    </p>
  );
}

export function CommentThreadDetail({
  thread,
  role,
  backHref,
  replyAction,
  resolveAction,
  returnAction,
  deleteMessageAction,
}: CommentThreadDetailProps) {
  const [replyState, replyFormAction, replyPending] = useActionState(
    replyAction,
    initialState,
  );
  const [resolveState, resolveFormAction, resolvePending] = useActionState(
    resolveAction,
    initialState,
  );
  const [returnState, returnFormAction, returnPending] = useActionState(
    returnAction,
    initialState,
  );
  const [deleteState, deleteFormAction, deletePending] = useActionState(
    deleteMessageAction,
    initialState,
  );

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 self-start text-sm font-semibold text-[var(--color-text-secondary)]"
      >
        <FiArrowLeft className="size-4" />
        Назад до зауважень
      </Link>

      <Card className="p-4 sm:p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="break-words text-xl font-bold sm:text-2xl">
                {thread.title ?? "Обговорення документа"}
              </h1>
              <Badge variant={statusVariant(thread.status)}>
                {getCommentThreadStatusLabel(thread.status)}
              </Badge>
            </div>
            <p className="mt-2 break-words text-[var(--color-text-secondary)]">
              {thread.projectName} · {thread.documentTitle}
              {thread.version ? ` · версія ${thread.version}` : ""}
            </p>
            {thread.section && (
              <p className="mt-2 text-sm">Розділ: {thread.section}</p>
            )}
          </div>
          <div className="text-sm text-[var(--color-text-muted)]">
            Автор: {thread.createdByName}
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-3">
        {thread.messages.map((message) => {
          return (
            <Card key={message.id} className="p-5">
              <div className="flex min-w-0 items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="break-words font-semibold">
                    {message.authorName}
                    <span className="ml-2 text-xs font-normal text-[var(--color-text-muted)]">
                      {message.authorRole}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {formatDate(message.createdAt)}
                    {message.editedAt ? " · редаговано" : ""}
                  </div>
                </div>

                {message.canDelete && (
                  <form action={deleteFormAction}>
                    <input type="hidden" name="messageId" value={message.id} />
                    <Button type="submit" variant="ghost" disabled={deletePending}>
                      Видалити
                    </Button>
                  </form>
                )}
              </div>

              <p
                className={`mt-4 break-words whitespace-pre-wrap text-sm leading-6 ${
                  message.isDeleted
                    ? "italic text-[var(--color-text-muted)]"
                    : "text-[var(--color-text-secondary)]"
                }`}
              >
                {message.content ?? "Повідомлення видалено"}
              </p>
            </Card>
          );
        })}
      </div>

      <ActionMessage state={deleteState} />

      {(role === "EXPERT" || role === "DESIGNER") && (
        <Card className="p-5">
          <form action={replyFormAction} className="flex flex-col gap-3">
            <input type="hidden" name="threadId" value={thread.id} />
            <label className="font-semibold">Відповісти</label>
            <Textarea
              name="content"
              minLength={2}
              maxLength={5000}
              required
              disabled={thread.status === "resolved" || replyPending}
              placeholder={
                thread.status === "resolved"
                  ? "Виконане зауваження не приймає відповіді."
                  : "Додайте повідомлення до обговорення…"
              }
            />
            <ActionMessage state={replyState} />
            <Button
              type="submit"
              disabled={thread.status === "resolved" || replyPending}
              className="w-full self-end sm:w-auto"
            >
              {replyPending ? "Надсилання…" : "Надіслати"}
            </Button>
          </form>
        </Card>
      )}

      {role === "DESIGNER" && thread.status !== "resolved" && (
        <form action={resolveFormAction} className="flex flex-col items-stretch gap-2 sm:items-end">
          <input type="hidden" name="threadId" value={thread.id} />
          <ActionMessage state={resolveState} />
          <Button type="submit" disabled={resolvePending} className="w-full sm:w-auto">
            {resolvePending ? "Збереження…" : "Позначити виконаним"}
          </Button>
        </form>
      )}

      {role === "EXPERT" && thread.status === "resolved" && (
        <Card className="p-5">
          <form action={returnFormAction} className="flex flex-col gap-3">
            <input type="hidden" name="threadId" value={thread.id} />
            <label className="font-semibold">Повернення на доопрацювання</label>
            <Textarea
              name="reason"
              maxLength={5000}
              placeholder="Причина або додаткове пояснення (необовʼязково)"
              disabled={returnPending}
            />
            <ActionMessage state={returnState} />
            <Button type="submit" disabled={returnPending} className="w-full self-end sm:w-auto">
              {returnPending ? "Повернення…" : "Повернути на доопрацювання"}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
