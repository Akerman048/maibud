import type { CommentItem } from "@/types/comment";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

type RemarksViewProps = {
  comments: CommentItem[];
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

export function RemarksView({ comments }: RemarksViewProps) {
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

            <Badge variant={getStatusVariant(comment.status)}>
              {getStatusLabel(comment.status)}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}
