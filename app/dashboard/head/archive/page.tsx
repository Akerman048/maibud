import { getArchiveProjects } from "@/lib/archive";
import { ArchiveView } from "@/components/archive/ArchiveView";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { UserRole } from "@/app/generated/prisma/client";
import { requireRole } from "@/lib/auth-guard";
import type { ArchiveQuery } from "@/types/archive";

export default async function HeadArchivePage({
  searchParams,
}: {
  searchParams: Promise<ArchiveQuery>;
}) {
  const [currentUser, query] = await Promise.all([
    requireRole([UserRole.HEAD]),
    searchParams,
  ]);
  const result = await getArchiveProjects(currentUser.id, currentUser.role, query);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-[22px]">
        <Header
          title="Архів"
          subtitle={`${result.total} архівні справи`}
        />

        <ArchiveView
          result={result}
          query={query}
          baseHref="/dashboard/head/archive"
        />
      </div>
    </DashboardLayout>
  );
}
