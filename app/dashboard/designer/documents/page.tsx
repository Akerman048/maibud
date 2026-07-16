import { DocumentsView } from "@/components/documents/DocumentsView";
import { UploadDocumentButton } from "@/components/documents/UploadDocumentButton";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { getProjectMemberOptions, getProjectOptions } from "@/lib/projects";
import { UserRole } from "@/app/generated/prisma/client";
import { requireRole } from "@/lib/auth-guard";
import { normalizeDocumentSearchParams, searchDocuments } from "@/lib/document-search";
import { DocumentListControls } from "@/components/documents/DocumentListControls";
import { PageSizeSelect } from "@/components/search/PageSizeSelect";
import { Pagination } from "@/components/search/Pagination";

export default async function DesignerDocumentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [currentUser, raw] = await Promise.all([requireRole([UserRole.DESIGNER]), searchParams]);
  const query = normalizeDocumentSearchParams(raw, currentUser.id, currentUser.role);
  const [result, projects, reviewers] = await Promise.all([searchDocuments(query), getProjectOptions(currentUser.id, currentUser.role), getProjectMemberOptions(currentUser.id, currentUser.role, UserRole.EXPERT)]);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-[22px]">
        <Header
          title="Документи"
          subtitle="Завантажені файли проєктів"
          action={<UploadDocumentButton projects={projects} />}
        />

        <DocumentListControls query={Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]))} basePath="/dashboard/designer/documents" projects={projects} reviewers={reviewers} />
        <div className="flex justify-end"><PageSizeSelect value={query.pageSize} /></div>
        <DocumentsView documents={result.items} />
        <Pagination pagination={result.pagination} />
      </div>
    </DashboardLayout>
  );
}
