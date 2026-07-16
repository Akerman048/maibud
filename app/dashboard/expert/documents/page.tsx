import { DocumentsView } from "@/components/documents/DocumentsView";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { UserRole } from "@/app/generated/prisma/client";
import { requireRole } from "@/lib/auth-guard";
import { normalizeDocumentSearchParams, searchDocuments } from "@/lib/document-search";
import { getProjectMemberOptions, getProjectOptions } from "@/lib/projects";
import { DocumentListControls } from "@/components/documents/DocumentListControls";
import { PageSizeSelect } from "@/components/search/PageSizeSelect";
import { Pagination } from "@/components/search/Pagination";

export default async function ExpertDocumentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [currentUser, raw] = await Promise.all([requireRole([UserRole.EXPERT]), searchParams]);
  const query = normalizeDocumentSearchParams(raw, currentUser.id, currentUser.role);
  const [result, projects, authors] = await Promise.all([searchDocuments(query), getProjectOptions(currentUser.id, currentUser.role), getProjectMemberOptions(currentUser.id, currentUser.role, UserRole.DESIGNER)]);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-[22px]">
        <Header title="Документи" subtitle="Файли, доступні для експертизи" />

        <DocumentListControls query={Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]))} basePath="/dashboard/expert/documents" projects={projects} authors={authors} />
        <div className="flex justify-end"><PageSizeSelect value={query.pageSize} /></div>
        <DocumentsView documents={result.items} />
        <Pagination pagination={result.pagination} />
      </div>
    </DashboardLayout>
  );
}
