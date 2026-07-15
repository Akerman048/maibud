"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import type { EmailSettingsActionState } from "@/types/email";

const settingsSchema = z.object({
  emailNotificationsEnabled: z.boolean(),
  emailDocumentUpdates: z.boolean(),
  emailCommentUpdates: z.boolean(),
  emailMembershipUpdates: z.boolean(),
});

export async function updateEmailNotificationSettings(
  _previousState: EmailSettingsActionState,
  formData: FormData,
): Promise<EmailSettingsActionState> {
  try {
    const currentUser = await requireUser();
    const input = settingsSchema.parse({
      emailNotificationsEnabled: formData.has("emailNotificationsEnabled"),
      emailDocumentUpdates: formData.has("emailDocumentUpdates"),
      emailCommentUpdates: formData.has("emailCommentUpdates"),
      emailMembershipUpdates: formData.has("emailMembershipUpdates"),
    });

    await prisma.user.update({
      where: { id: currentUser.id },
      data: input,
    });

    revalidatePath("/dashboard", "layout");
    return { success: true, error: "" };
  } catch {
    return {
      success: false,
      error: "Не вдалося зберегти налаштування email.",
    };
  }
}
