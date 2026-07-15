import { CommentsView } from "@/components/comments/CommentsView";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { getComments } from "@/lib/comments";
import { returnComment } from "./actions";

export default async function ExpertCommentsPage() {
  const comments = await getComments();

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-[22px]">
        <Header
          title="Зауваження"
          subtitle="Зауваження до проєктної документації"
        />

        <CommentsView comments={comments} returnCommentAction={returnComment} />
      </div>
    </DashboardLayout>
  );
}
