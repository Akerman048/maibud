import {
  ProjectStatus as PrismaProjectStatus,
  UserRole,
} from "@/app/generated/prisma/client";
import type { Project, ProjectStatus } from "@/types/project";
import { prisma } from "@/lib/prisma";

function mapProjectStatus(status: string): ProjectStatus {
  if (status === "OPEN") return "open";
  if (status === "IN_PROGRESS") return "processed";
  if (status === "RETURNED") return "returned";
  if (status === "COMPLETED") return "resolved";
  if (status === "ARCHIVED") return "archived";

  return "open";
}

function mapProject(project: {
  id: string;
  name: string;
  address: string;
  customer: string;
  stage: string;
  deadline: Date | null;
  status: string;
  archivedAt: Date | null;
  archiveReason: string | null;
  restoredAt: Date | null;
  archivedBy: { name: string } | null;
  restoredBy: { name: string } | null;
  members: {
    role: UserRole;
    user: {
      name: string;
    };
  }[];
}): Project {
  const expertMember = project.members.find(
    (member) => member.role === UserRole.EXPERT,
  );

  return {
    id: project.id,
    name: project.name,
    address: project.address,
    customer: project.customer,
    stage: project.stage,
    expert: expertMember?.user.name ?? "Не призначено",
    deadline: project.deadline
      ? project.deadline.toLocaleDateString("uk-UA")
      : "—",
    status: mapProjectStatus(project.status),
    archivedAt: project.archivedAt?.toISOString() ?? null,
    archivedByName: project.archivedBy?.name ?? null,
    archiveReason: project.archiveReason,
    restoredAt: project.restoredAt?.toISOString() ?? null,
    restoredByName: project.restoredBy?.name ?? null,
  };
}

export async function getProjects(): Promise<Project[]> {
  const projects = await prisma.project.findMany({
    where: {
      status: {
        not: PrismaProjectStatus.ARCHIVED,
      },
    },
    include: {
      archivedBy: { select: { name: true } },
      restoredBy: { select: { name: true } },
      members: {
        include: {
          user: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return projects.map(mapProject);
}

export async function getProjectById(id: string): Promise<Project | null> {
  const project = await prisma.project.findUnique({
    where: {
      id,
    },
    include: {
      archivedBy: { select: { name: true } },
      restoredBy: { select: { name: true } },
      members: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!project) {
    return null;
  }

  return mapProject(project);
}

export async function getExperts() {
  return prisma.user.findMany({
    where: {
      role: UserRole.EXPERT,
    },
    orderBy: {
      name: "asc",
    },
  });
}

export async function getProjectOptions() {
  const projects = await prisma.project.findMany({
    where: {
      status: {
        not: PrismaProjectStatus.ARCHIVED,
      },
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return projects;
}
