"use server";

import { revalidatePath } from "next/cache";

import { DocumentStatus, UserRole } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function createDocument(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const projectId = String(formData.get("projectId") ?? "").trim();

  if (!name || !projectId) {
    throw new Error("Заповніть усі поля");
  }

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      id: true,
    },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  const designer = await prisma.user.findFirst({
    where: {
      role: UserRole.DESIGNER,
    },
  });

  if (!designer) {
    throw new Error("Designer not found");
  }

  await prisma.$transaction(async (tx) => {
    const document = await tx.document.create({
      data: {
        title: name,
        status: DocumentStatus.SUBMITTED,
        projectId,
        authorId: designer.id,
      },
    });

    await tx.auditLog.create({
      data: {
        action: "Завантажено документ",
        entityType: "DOCUMENT",
        entityId: document.id,
        userId: designer.id,
        projectId,
      },
    });
  });

  revalidatePath("/dashboard/designer/documents");
  revalidatePath("/dashboard/expert/documents");
  revalidatePath(`/dashboard/designer/projects/${projectId}`);
  revalidatePath(`/dashboard/expert/projects/${projectId}`);
  revalidatePath(`/dashboard/head/projects/${projectId}`);
  revalidatePath(`/dashboard/archivist/projects/${projectId}`);
  revalidatePath(`/project/${projectId}`);
}