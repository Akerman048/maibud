"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import type { NotificationActionState } from "@/types/notification";

function revalidateNotifications() {
  revalidatePath("/dashboard", "layout");
}

export async function markNotificationAsRead(
  _previousState: NotificationActionState,
  formData: FormData,
): Promise<NotificationActionState> {
  try {
    const currentUser = await requireUser();
    const notificationId = String(
      formData.get("notificationId") ?? "",
    ).trim();

    if (!notificationId) {
      return { error: "Сповіщення не знайдено.", success: false };
    }

    const ownedNotification = await prisma.notification.findFirst({
      where: { id: notificationId, userId: currentUser.id },
      select: { id: true, readAt: true },
    });

    if (!ownedNotification) {
      return { error: "Сповіщення не знайдено.", success: false };
    }

    if (!ownedNotification.readAt) {
      await prisma.notification.updateMany({
        where: {
          id: ownedNotification.id,
          userId: currentUser.id,
          readAt: null,
        },
        data: { readAt: new Date() },
      });
    }

    revalidateNotifications();
    return { error: "", success: true };
  } catch (error) {
    console.error("Mark notification as read failed", error);
    return { error: "Не вдалося оновити сповіщення.", success: false };
  }
}

export async function markAllNotificationsAsRead(): Promise<NotificationActionState> {
  try {
    const currentUser = await requireUser();

    await prisma.notification.updateMany({
      where: { userId: currentUser.id, readAt: null },
      data: { readAt: new Date() },
    });

    revalidateNotifications();
    return { error: "", success: true };
  } catch (error) {
    console.error("Mark all notifications as read failed", error);
    return { error: "Не вдалося оновити сповіщення.", success: false };
  }
}
