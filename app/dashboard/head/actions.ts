
"use server";

import { revalidatePath } from "next/cache";

import { ProjectStatus, UserRole } from "@/app/generated/prisma/client";
import { requireCurrentHeadOrganization } from "@/lib/organization-access";
import { prisma } from "@/lib/prisma";

export async function createProject(formData: FormData) {
  const { user: currentUser, organization } =
    await requireCurrentHeadOrganization();

  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const customer = String(formData.get("customer") ?? "").trim();
  const stage = String(formData.get("stage") ?? "").trim();
  const expertId = String(formData.get("expert") ?? "").trim();
  const deadlineValue = String(formData.get("deadline") ?? "").trim();

  if (!name || !address || !customer || !stage || !deadlineValue) {
    throw new Error("Заповніть усі поля");
  }

  const deadline = new Date(deadlineValue);

  if (Number.isNaN(deadline.getTime())) {
    throw new Error("Некоректна дата завершення");
  }

  await prisma.$transaction(async (tx) => {
    const headMembership = await tx.organizationMember.findFirst({
      where: {
        organizationId: organization.id,
        userId: currentUser.id,
        role: UserRole.HEAD,
        removedAt: null,
        user: { isActive: true },
      },
      select: { id: true },
    });
    if (!headMembership) throw new Error("Organization access lost");

    const expert = expertId
      ? await tx.user.findFirst({
          where: {
            id: expertId,
            isActive: true,
            organizationMemberships: {
              some: {
                organizationId: organization.id,
                role: UserRole.EXPERT,
                removedAt: null,
              },
            },
          },
          select: { id: true },
        })
      : null;
    if (expertId && !expert) throw new Error("Expert not found in organization");

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
            ...(expert
              ? [{ userId: expert.id, role: UserRole.EXPERT }]
              : []),
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
  const { user: currentUser, organization } =
    await requireCurrentHeadOrganization();

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
    !deadlineValue
  ) {
    throw new Error("Заповніть усі поля");
  }

  const deadline = new Date(deadlineValue);

  if (Number.isNaN(deadline.getTime())) {
    throw new Error("Некоректна дата завершення");
  }

  const project = await prisma.project.findFirst({
    where: {
      id,
      organizationId: organization.id,
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
    const expert = expertId
      ? await tx.user.findFirst({
          where: {
            id: expertId,
            isActive: true,
            organizationMemberships: {
              some: {
                organizationId: organization.id,
                role: UserRole.EXPERT,
                removedAt: null,
              },
            },
          },
          select: { id: true },
        })
      : null;
    if (expertId && !expert) throw new Error("Expert not found in organization");

    const updateResult = await tx.project.updateMany({
      where: {
        id,
        organizationId: organization.id,
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

    if (expert) {
      await tx.projectMember.create({
        data: {
          projectId: id,
          userId: expert.id,
          role: UserRole.EXPERT,
        },
      });
    }

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
