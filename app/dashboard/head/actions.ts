
"use server";

import { revalidatePath } from "next/cache";

import { ProjectStatus, UserRole } from "@/app/generated/prisma/client";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function createProject(formData: FormData) {
  const currentUser = await requireRole([UserRole.HEAD]);

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
              userId: currentUser.id,
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
        userId: currentUser.id,
        projectId: createdProject.id,
      },
    });

  });

  revalidatePath("/dashboard/head");
  revalidatePath("/dashboard/head/projects");
}

export async function updateProject(formData: FormData) {
  const currentUser = await requireRole([UserRole.HEAD]);

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

  const expert = await prisma.user.findFirst({
    where: {
      id: expertId,
      role: UserRole.EXPERT,
    },
  });

  if (!expert) {
    throw new Error("Expert not found");
  }

  const project = await prisma.project.findFirst({
    where: {
      id,
      members: {
        some: {
          userId: currentUser.id,
          role: UserRole.HEAD,
        },
      },
      organization: {
        members: {
          some: {
            userId: currentUser.id,
            role: UserRole.HEAD,
            removedAt: null,
            user: { isActive: true },
          },
        },
      },
    },
  });

  if (!project) {
    throw new Error("Project not found or access denied");
  }

  if (project.status === ProjectStatus.ARCHIVED) {
    throw new Error("Архівний проєкт доступний лише для читання");
  }

  await prisma.$transaction(async (tx) => {
    const updateResult = await tx.project.updateMany({
      where: {
        id,
        status: { not: ProjectStatus.ARCHIVED },
        members: { some: { userId: currentUser.id, role: UserRole.HEAD } },
        organization: {
          members: {
            some: {
              userId: currentUser.id,
              role: UserRole.HEAD,
              removedAt: null,
              user: { isActive: true },
            },
          },
        },
      },
      data: {
        name,
        address,
        customer,
        stage,
        deadline,
      },
    });

    if (updateResult.count !== 1) {
      throw new Error("Проєкт уже архівовано або доступ втрачено");
    }

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
        userId: currentUser.id,
        projectId: id,
      },
    });
  });

  revalidatePath("/dashboard/head");
  revalidatePath("/dashboard/head/projects");
  revalidatePath(`/dashboard/head/projects/${id}`);
}
