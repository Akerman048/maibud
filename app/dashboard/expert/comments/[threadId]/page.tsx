import { notFound } from "next/navigation";

import { UserRole } from "@/app/generated/prisma/client";
import {
  deleteCommentMessage,
  markCommentThreadResolved,
  replyToCommentThread,
  returnCommentThread,
} from "@/app/dashboard/comment-thread-actions";
import { CommentThreadDetail } from "@/components/comments/CommentThreadDetail";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { requireRole } from "@/lib/auth-guard";
import { getCommentThreadById } from "@/lib/comment-threads";

type PageProps = {
  params: Promise<{ threadId: string }>;
};

export default async function ExpertCommentThreadPage({ params }: PageProps) {
  const currentUser = await requireRole([UserRole.EXPERT]);
  const { threadId } = await params;
  const thread = await getCommentThreadById(
    threadId,
    currentUser.id,
    currentUser.role,
  );

  if (!thread) notFound();

  return (
    <DashboardLayout>
      <CommentThreadDetail
        thread={thread}
        role={currentUser.role}
        backHref="/dashboard/expert/comments"
        replyAction={replyToCommentThread}
        resolveAction={markCommentThreadResolved}
        returnAction={returnCommentThread}
        deleteMessageAction={deleteCommentMessage}
      />
    </DashboardLayout>
  );
}
