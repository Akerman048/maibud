"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

export async function createDocument(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const projectId = String(formData.get("projectId") ?? "").trim();

  if (!name || !projectId) {
    throw new Error("Заповніть усі поля");
  }

  const designer = await prisma.user.findFirst({
    where: {
      role: "DESIGNER",
    },
  });

  if (!designer) {
    throw new Error("Designer not found");
  }

  await prisma.document.create({
    data: {
      title: name,
      status: "SUBMITTED",
      projectId,
      authorId: designer.id,
    },
  });

  revalidatePath("/dashboard/designer/documents");
  revalidatePath("/dashboard/expert/documents");
}