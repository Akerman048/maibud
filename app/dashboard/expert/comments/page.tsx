import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { RemarksView } from "@/components/remarks/RemarksView";

export default function ExpertCommentsPage() {
  return (
    <DashboardLayout role="expert">
      <div className="flex flex-col gap-[22px]">
        <Header title="Зауваження" subtitle="6 відкритих зауважень" />
        <RemarksView />
      </div>
    </DashboardLayout>
  );
}