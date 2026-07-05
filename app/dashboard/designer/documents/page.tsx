import { DocumentsView } from "@/components/documents/DocumentsView";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { UploadDocumentButton } from "@/components/documents/UploadDocumentButton";

export default function DesignerDocumentsPage() {
  return (
    <DashboardLayout role="designer">
      <div className="flex flex-col gap-[22px]">
        <Header
          title="Документи"
          subtitle="Завантажені файли проєктів"
          action={<UploadDocumentButton />}
        />{" "}
        <DocumentsView />
      </div>
    </DashboardLayout>
  );
}
