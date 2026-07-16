import "server-only";

import { ProjectStatus, UserRole } from "@/app/generated/prisma/client";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function getClientProjects() {
  const currentUser = await requireRole([UserRole.CLIENT]);

  return prisma.project.findMany({
    where: {
      status: { not: ProjectStatus.ARCHIVED },
      members: {
        some: {
          userId: currentUser.id,
          role: UserRole.CLIENT,
        },
      },
    },
    select: {
      id: true,
      name: true,
      address: true,
      customer: true,
      stage: true,
      status: true,
      deadline: true,
      updatedAt: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
}

export async function getClientProjectById(projectId: string) {
  const currentUser = await requireRole([UserRole.CLIENT]);

  return prisma.project.findFirst({
    where: {
      id: projectId,
      status: { not: ProjectStatus.ARCHIVED },
      members: {
        some: {
          userId: currentUser.id,
          role: UserRole.CLIENT,
        },
      },
    },
    select: {
      id: true,
      name: true,
      address: true,
      customer: true,
      stage: true,
      status: true,
      deadline: true,
      documents: {
        where: {
          isPublishedToClient: true,
          status: "APPROVED",
        },
        select: {
          id: true,
          title: true,
          status: true,
          publishedAt: true,
          versions: {
            orderBy: {
              version: "desc",
            },
            take: 1,
            select: {
              id: true,
              version: true,
              fileName: true,
              mimeType: true,
              fileSize: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          publishedAt: "desc",
        },
      },
    },
  });
}
