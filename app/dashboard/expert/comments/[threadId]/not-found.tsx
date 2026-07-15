import Link from "next/link";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ExpertCommentThreadNotFound() {
  return (
    <DashboardLayout>
      <EmptyState
        title="Обговорення не знайдено"
        description="Воно не існує або у вас немає доступу до його проєкту."
        action={
          <Button asChild>
            <Link href="/dashboard/expert/comments">До зауважень</Link>
          </Button>
        }
      />
    </DashboardLayout>
  );
}
