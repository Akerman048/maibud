import { notFound } from "next/navigation";

import { ArchiveDetailView } from "@/components/archive/ArchiveDetailView";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getArchiveProjectById } from "@/lib/archive";
import { UserRole } from "@/app/generated/prisma/client";
import { requireRole } from "@/lib/auth-guard";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ArchivistArchiveDetailPage({
  params,
}: PageProps) {
  const { id } = await params;
  const currentUser = await requireRole([UserRole.DESIGNER]);

  const project = await getArchiveProjectById(id, currentUser.id, currentUser.role);

  if (!project) {
    notFound();
  }

  return (
    <DashboardLayout>
      {" "}
      <ArchiveDetailView project={project} backHref="/dashboard/designer/archive" />
    </DashboardLayout>
  );
}
