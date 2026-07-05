import { DocumentsView } from "@/components/documents/DocumentsView";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";

export default function ExpertDocumentsPage() {
  return (
    <DashboardLayout role="expert">
      <div className="flex flex-col gap-[22px]">
        <Header title="Документи" subtitle="Файли, доступні для експертизи" />
        <DocumentsView />
      </div>
    </DashboardLayout>
  );
}