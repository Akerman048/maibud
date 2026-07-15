import "server-only";

import type {
  NotificationType,
  Prisma,
} from "@/app/generated/prisma/client";
import {
  getUniqueNotificationRecipientIds,
  isSafeNotificationHref,
  shouldNotifyActor,
} from "@/lib/notification-policy";

export type CreateNotificationInput = {
  userId: string;
  actorId?: string;
  type: NotificationType;
  title: string;
  message: string;
  href?: string | null;
  projectId?: string;
  documentId?: string;
  commentThreadId?: string;
};

function normalizeNotificationInput(input: CreateNotificationInput) {
  const title = input.title.trim();
  const message = input.message.trim();
  const href = input.href?.trim() || null;

  if (title.length < 1 || title.length > 200) {
    throw new Error("Notification title must contain 1–200 characters");
  }

  if (message.length < 1 || message.length > 1000) {
    throw new Error("Notification message must contain 1–1000 characters");
  }

  if (href && !isSafeNotificationHref(href)) {
    throw new Error("Notification href must be a safe internal path");
  }

  return { ...input, title, message, href };
}

export async function createNotification(
  tx: Prisma.TransactionClient,
  input: CreateNotificationInput,
) {
  if (!shouldNotifyActor({
    recipientUserId: input.userId,
    actorUserId: input.actorId,
  })) {
    return null;
  }

  const normalized = normalizeNotificationInput(input);

  return tx.notification.create({
    data: {
      type: normalized.type,
      title: normalized.title,
      message: normalized.message,
      href: normalized.href,
      userId: normalized.userId,
      actorId: normalized.actorId,
      projectId: normalized.projectId,
      documentId: normalized.documentId,
      commentThreadId: normalized.commentThreadId,
    },
  });
}

export async function createNotifications(
  tx: Prisma.TransactionClient,
  inputs: CreateNotificationInput[],
) {
  const uniqueRecipients = getUniqueNotificationRecipientIds(
    inputs.map((input) => input.userId),
    inputs[0]?.actorId,
  );
  const byRecipient = new Map<string, CreateNotificationInput>();

  for (const input of inputs) {
    if (uniqueRecipients.includes(input.userId) && !byRecipient.has(input.userId)) {
      byRecipient.set(input.userId, input);
    }
  }

  return Promise.all(
    Array.from(byRecipient.values(), (input) =>
      createNotification(tx, input),
    ),
  );
}
