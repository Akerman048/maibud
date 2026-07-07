"use server";

import { revalidatePath } from "next/cache";

import { CommentStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function returnComment(formData: FormData) {
  const commentId = String(formData.get("commentId") ?? "").trim();

  if (!commentId) {
    throw new Error("Comment id is required");
  }

  await prisma.comment.update({
    where: { id: commentId },
    data: { status: CommentStatus.RETURNED },
  });

  revalidatePath("/dashboard/expert/comments");
  revalidatePath("/dashboard/designer/comments");
}
