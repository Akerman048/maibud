import "server-only";

import type {
  NotificationType,
  Prisma,
  UserRole,
} from "@/app/generated/prisma/client";
import {
  areEmailNotificationsAllowed,
  getEmailEvent,
  type EmailPreferences,
} from "@/lib/email/email-events";
import { isValidEmail } from "@/lib/email/safety";
import { getEmailSubject } from "@/lib/email/templates";

type NotificationForEmail = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string | null;
  userId: string;
  actorId: string | null;
};

type RecipientForEmail = EmailPreferences & {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
};

export async function createEmailJobForNotification(
  tx: Prisma.TransactionClient,
  {
    notification,
    recipient,
  }: {
    notification: NotificationForEmail;
    recipient: RecipientForEmail;
  },
) {
  const event = getEmailEvent(notification.type);

  if (
    !event ||
    !recipient.isActive ||
    !isValidEmail(recipient.email) ||
    notification.actorId === recipient.id ||
    !areEmailNotificationsAllowed(event.category, recipient)
  ) {
    return null;
  }

  return tx.emailJob.create({
    data: {
      template: event.template,
      recipientEmail: recipient.email,
      recipientName: recipient.name,
      subject: getEmailSubject(event.template),
      payload: {
        recipientName: recipient.name,
        message: notification.message,
        href: notification.href,
      },
      notificationId: notification.id,
    },
  });
}

export async function createInvitationEmailJob(
  tx: Prisma.TransactionClient,
  input: {
    invitationId: string;
    recipientEmail: string;
    recipientName?: string;
    organizationName: string;
    role: UserRole;
    projectName?: string;
    expiresAt: Date;
    href: string;
  },
) {
  if (!isValidEmail(input.recipientEmail)) {
    throw new Error("Invitation recipient email is invalid");
  }

  if (!/^\/invite\/[A-Za-z0-9_-]+$/.test(input.href)) {
    throw new Error("Invitation href is invalid");
  }

  return tx.emailJob.create({
    data: {
      template: "INVITATION_CREATED",
      recipientEmail: input.recipientEmail,
      recipientName: input.recipientName,
      subject: getEmailSubject("INVITATION_CREATED"),
      payload: {
        invitationId: input.invitationId,
        recipientName: input.recipientName ?? null,
        organizationName: input.organizationName,
        role: input.role,
        projectName: input.projectName ?? null,
        expiresAt: input.expiresAt.toISOString(),
        href: input.href,
      },
    },
  });
}

export async function cancelPendingInvitationEmailJobs(
  tx: Prisma.TransactionClient,
  invitationId: string,
) {
  return tx.emailJob.updateMany({
    where: {
      template: "INVITATION_CREATED",
      status: "PENDING",
      payload: {
        path: ["invitationId"],
        equals: invitationId,
      },
    },
    data: {
      status: "CANCELLED",
      failedAt: new Date(),
      lastError: "Superseded by a newer invitation email",
      payload: { invitationId, sanitized: true },
    },
  });
}
