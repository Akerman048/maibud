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

  const expert = await prisma.user.findUnique({
    where: {
      id: expertId,
    },
  });

  if (!expert) {
    throw new Error("Expert not found");
  }

  await prisma.project.create({
    data: {
      name,
      address,
      customer,
      stage,
      status: ProjectStatus.OPEN,
      deadline: new Date(deadlineValue),
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

  revalidatePath("/dashboard/head");
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
        deadline: new Date(deadlineValue),
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
  });

  revalidatePath("/dashboard/head");
  revalidatePath(`/dashboard/head/projects/${id}`);
}