import { UserRole } from "@/app/generated/prisma/client";
import { CommentThreadsView } from "@/components/comments/CommentThreadsView";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { requireRole } from "@/lib/auth-guard";
import { getCommentThreads, normalizeCommentThreadSearchParams } from "@/lib/comment-threads";
import { getProjectOptions } from "@/lib/projects";
import { CommentListControls } from "@/components/comments/CommentListControls";
import { PageSizeSelect } from "@/components/search/PageSizeSelect";
import { Pagination } from "@/components/search/Pagination";

export default async function DesignerCommentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [currentUser, raw] = await Promise.all([requireRole([UserRole.DESIGNER]), searchParams]);
  const query = normalizeCommentThreadSearchParams(raw, currentUser.id, currentUser.role);
  const [result, projects] = await Promise.all([getCommentThreads(query), getProjectOptions(currentUser.id, currentUser.role)]);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-[22px]">
        <Header
          title="Зауваження"
          subtitle="Зауваження експертів до ваших документів"
        />

        <CommentListControls query={Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]))} basePath="/dashboard/designer/comments" projects={projects} />
        <div className="flex justify-end"><PageSizeSelect value={query.pageSize} /></div>
        <CommentThreadsView
          threads={result.items}
          detailBaseHref="/dashboard/designer/comments"
        />
        <Pagination pagination={result.pagination} />
      </div>
    </DashboardLayout>
  );
}
