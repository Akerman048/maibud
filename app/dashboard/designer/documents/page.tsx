import { DocumentsView } from "@/components/documents/DocumentsView";
import { UploadDocumentButton } from "@/components/documents/UploadDocumentButton";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { getDocuments } from "@/lib/documents";
import { getProjectOptions } from "@/lib/projects";

export default async function DesignerDocumentsPage() {
  const documents = await getDocuments();
  const projects = await getProjectOptions();

  return (
    <DashboardLayout role="designer">
      <div className="flex flex-col gap-[22px]">
        <Header
          title="Документи"
          subtitle="Завантажені файли проєктів"
          action={<UploadDocumentButton projects={projects} />}
        />

        <DocumentsView documents={documents} />
      </div>
    </DashboardLayout>
  );
}
