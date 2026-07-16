"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import type { ProfileActionState } from "@/types/profile";

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Імʼя має містити щонайменше 2 символи.")
    .max(100, "Імʼя не може перевищувати 100 символів."),
});

export async function updateProfile(
  _previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  try {
    const currentUser = await requireUser();
    const parsed = profileSchema.safeParse({
      name: formData.get("name"),
    });

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Перевірте введене імʼя.",
      };
    }

    await prisma.user.update({
      where: { id: currentUser.id },
      data: { name: parsed.data.name },
    });

    revalidatePath("/dashboard", "layout");
    return { success: true, error: "" };
  } catch {
    return {
      success: false,
      error: "Не вдалося оновити профіль.",
    };
  }
}
