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
          <div className="flex items-start justify-between gap-5">
            <div>
              <div className="font-semibold">{comment.section}</div>

              <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {comment.projectName} · {comment.documentTitle}
              </div>

              <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                {comment.text}
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-3">
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
