
"use server";

import { revalidatePath } from "next/cache";

import { ProjectStatus, UserRole } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function createProject(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const customer = String(formData.get("customer") ?? "").trim();
  const stage = String(formData.get("stage") ?? "").trim();
  const expertId = String(formData.get("expert") ?? "").trim();
  const deadlineValue = String(formData.get("deadline") ?? "").trim();

  if (!name || !address || !customer || !stage || !expertId || !deadlineValue) {
    throw new Error("Заповніть усі поля");
  }

  const deadline = new Date(deadlineValue);

  if (Number.isNaN(deadline.getTime())) {
    throw new Error("Некоректна дата завершення");
  }

  const organization = await prisma.organization.findFirst();

  if (!organization) {
    throw new Error("Organization not found");
  }

  const head = await prisma.user.findFirst({
    where: {
      role: UserRole.HEAD,
    },
  });

  if (!head) {
    throw new Error("Head user not found");
  }

  const expert = await prisma.user.findFirst({
    where: {
      id: expertId,
      role: UserRole.EXPERT,
    },
  });

  if (!expert) {
    throw new Error("Expert not found");
  }

  await prisma.$transaction(async (tx) => {
    const createdProject = await tx.project.create({
      data: {
        name,
        address,
        customer,
        stage,
        status: ProjectStatus.OPEN,
        deadline,
        organizationId: organization.id,
        members: {
          create: [
            {
              userId: head.id,
              role: UserRole.HEAD,
            },
            {
              userId: expert.id,
              role: UserRole.EXPERT,
            },
          ],
        },
      },
    });

    await tx.auditLog.create({
      data: {
        action: "Створено проєкт",
        entityType: "PROJECT",
        entityId: createdProject.id,
        userId: head.id,
        projectId: createdProject.id,
      },
    });
  });

  revalidatePath("/dashboard/head");
  revalidatePath("/dashboard/head/projects");
}

export async function updateProject(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const customer = String(formData.get("customer") ?? "").trim();
  const stage = String(formData.get("stage") ?? "").trim();
  const expertId = String(formData.get("expert") ?? "").trim();
  const deadlineValue = String(formData.get("deadline") ?? "").trim();

  if (
    !id ||
    !name ||
    !address ||
    !customer ||
    !stage ||
    !expertId ||
    !deadlineValue
  ) {
    throw new Error("Заповніть усі поля");
  }

  const deadline = new Date(deadlineValue);

  if (Number.isNaN(deadline.getTime())) {
    throw new Error("Некоректна дата завершення");
  }

  const head = await prisma.user.findFirst({
    where: {
      role: UserRole.HEAD,
    },
  });

  if (!head) {
    throw new Error("Head user not found");
  }

  const expert = await prisma.user.findFirst({
    where: {
      id: expertId,
      role: UserRole.EXPERT,
    },
  });

  if (!expert) {
    throw new Error("Expert not found");
  }

  const project = await prisma.project.findUnique({
    where: {
      id,
    },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  await prisma.$transaction(async (tx) => {
    await tx.project.update({
      where: {
        id,
      },
      data: {
        name,
        address,
        customer,
        stage,
        deadline,
      },
    });

    await tx.projectMember.deleteMany({
      where: {
        projectId: id,
        role: UserRole.EXPERT,
      },
    });

    await tx.projectMember.create({
      data: {
        projectId: id,
        userId: expert.id,
        role: UserRole.EXPERT,
      },
    });

    await tx.auditLog.create({
      data: {
        action: "Оновлено дані проєкту",
        entityType: "PROJECT",
        entityId: id,
        userId: head.id,
        projectId: id,
      },
    });
  });

  revalidatePath("/dashboard/head");
  revalidatePath("/dashboard/head/projects");
  revalidatePath(`/dashboard/head/projects/${id}`);
}

export async function archiveProject(projectId: string) {
  if (!projectId) {
    throw new Error("Project id is required");
  }

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  const head = await prisma.user.findFirst({
    where: {
      role: UserRole.HEAD,
    },
  });

  if (!head) {
    throw new Error("Head user not found");
  }

  await prisma.$transaction(async (tx) => {
    await tx.project.update({
      where: {
        id: projectId,
      },
      data: {
        status: ProjectStatus.ARCHIVED,
      },
    });

    await tx.auditLog.create({
      data: {
        action: "Проєкт переміщено в архів",
        entityType: "PROJECT",
        entityId: projectId,
        userId: head.id,
        projectId,
      },
    });
  });

  revalidatePath("/dashboard/head");
  revalidatePath("/dashboard/head/projects");
  revalidatePath(`/dashboard/head/projects/${projectId}`);
  revalidatePath("/dashboard/head/archive");
}
