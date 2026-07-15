import { DocumentsView } from "@/components/documents/DocumentsView";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { getDocuments } from "@/lib/documents";

export default async function ExpertDocumentsPage() {
  const documents = await getDocuments();

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-[22px]">
        <Header title="Документи" subtitle="Файли, доступні для експертизи" />

        <DocumentsView documents={documents} />
      </div>
    </DashboardLayout>
  );
}