import { UserRole } from "@/app/generated/prisma/client";
import { CommentThreadsView } from "@/components/comments/CommentThreadsView";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { requireRole } from "@/lib/auth-guard";
import { getCommentThreadsForUser } from "@/lib/comment-threads";

export default async function ExpertCommentsPage() {
  const currentUser = await requireRole([UserRole.EXPERT]);
  const threads = await getCommentThreadsForUser(
    currentUser.id,
    currentUser.role,
  );

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-[22px]">
        <Header
          title="Зауваження"
          subtitle="Зауваження до проєктної документації"
        />

        <CommentThreadsView
          threads={threads}
          detailBaseHref="/dashboard/expert/comments"
        />
      </div>
    </DashboardLayout>
  );
}
