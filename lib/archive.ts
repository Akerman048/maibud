import { ProjectStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type ArchiveProjectStatus = "incomplete" | "closed";

export type ArchiveProject = {
  id: string;
  name: string;
  documentsTotal: number;
  documentsArchived: number;
  status: ArchiveProjectStatus;
  overduePromises: number;
};

export async function getArchiveProjects(): Promise<ArchiveProject[]> {
  const projects = await prisma.project.findMany({
    where: {
      status: ProjectStatus.ARCHIVED,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    documentsTotal: 18,
    documentsArchived: 12,
    status: "incomplete",
    overduePromises: 0,
  }));
}

export async function getArchiveProjectById(
  id: string,
): Promise<ArchiveProject | null> {
  const project = await prisma.project.findFirst({
    where: {
      id,
      status: ProjectStatus.ARCHIVED,
    },
  });

  if (!project) {
    return null;
  }

  return {
    id: project.id,
    name: project.name,
    documentsTotal: 18,
    documentsArchived: 12,
    status: "incomplete",
    overduePromises: 0,
  };
}