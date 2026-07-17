import type { CommentItem } from "@/types/comment";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

type CommentsViewProps = {
  comments: CommentItem[];
  resolveCommentAction?: (formData: FormData) => Promise<void>;
  returnCommentAction?: (formData: FormData) => Promise<void>;
};

function getStatusLabel(status: CommentItem["status"]) {
  if (status === "open") return "Відкрите";
  if (status === "resolved") return "Відпрацьоване";
  if (status === "returned") return "Повернено";

  return "Невідомо";
}

function getStatusVariant(status: CommentItem["status"]) {
  if (status === "resolved") return "success";
  if (status === "returned") return "danger";

  return "warning";
}

export function CommentsView({
  comments,
  resolveCommentAction,
  returnCommentAction,
}: CommentsViewProps) {
  if (comments.length === 0) {
    return (
      <EmptyState
        title="Зауважень немає"
        description="Нові зауваження зʼявляться тут."
      />
    );
  }

  return (
    <div className="grid gap-4">
      {comments.map((comment) => (
        <Card key={comment.id} className="p-5">
          <div className="flex min-w-0 flex-col items-stretch justify-between gap-5 sm:flex-row sm:items-start">
            <div className="min-w-0">
              <div className="break-words font-semibold">{comment.section}</div>

              <div className="mt-1 break-words text-sm text-[var(--color-text-secondary)]">
                {comment.projectName} · {comment.documentTitle}
              </div>

              <p className="mt-3 break-words text-sm leading-6 text-[var(--color-text-secondary)]">
                {comment.text}
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
              <Badge variant={getStatusVariant(comment.status)}>
                {getStatusLabel(comment.status)}
              </Badge>

              {comment.status === "open" && resolveCommentAction && (
                <form action={resolveCommentAction}>
                  <input type="hidden" name="commentId" value={comment.id} />

                  <Button type="submit" variant="secondary">
                    Позначити виконаним
                  </Button>
                </form>
              )}

              {comment.status === "resolved" && returnCommentAction && (
                <form action={returnCommentAction}>
                  <input type="hidden" name="commentId" value={comment.id} />

                  <Button type="submit" variant="secondary">
                    Повернути
                  </Button>
                </form>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
