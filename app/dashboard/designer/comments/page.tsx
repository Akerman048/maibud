import { CommentsView } from "@/components/comments/CommentsView";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { getComments } from "@/lib/comments";
import { resolveComment } from "./actions";

export default async function DesignerCommentsPage() {
  const comments = await getComments();

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-[22px]">
        <Header
          title="Зауваження"
          subtitle="Зауваження експертів до ваших документів"
        />

        <CommentsView
          comments={comments}
          resolveCommentAction={resolveComment}
        />
      </div>
    </DashboardLayout>
  );
}
