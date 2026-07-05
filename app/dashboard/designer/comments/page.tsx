import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { RemarksView } from "@/components/remarks/RemarksView";

export default function DesignerCommentsPage() {
  return (
    <DashboardLayout role="designer">
      <div className="flex flex-col gap-[22px]">
        <Header title="Зауваження" subtitle="8 зауважень потребують відповіді" />
        <RemarksView />
      </div>
    </DashboardLayout>
  );
}