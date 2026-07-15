import type {
  EmailTemplate,
  NotificationType,
} from "@/app/generated/prisma/client";

export type EmailCategory = "document" | "comment" | "membership";

export type EmailPreferences = {
  emailNotificationsEnabled: boolean;
  emailDocumentUpdates: boolean;
  emailCommentUpdates: boolean;
  emailMembershipUpdates: boolean;
};

type EmailEvent = {
  template: EmailTemplate;
  category: EmailCategory;
};

const EMAIL_EVENTS: Partial<Record<NotificationType, EmailEvent>> = {
  DOCUMENT_SUBMITTED: {
    template: "DOCUMENT_SUBMITTED",
    category: "document",
  },
  DOCUMENT_VERSION_UPLOADED: {
    template: "DOCUMENT_VERSION_UPLOADED",
    category: "document",
  },
  DOCUMENT_APPROVED: {
    template: "DOCUMENT_APPROVED",
    category: "document",
  },
  DOCUMENT_REJECTED: {
    template: "DOCUMENT_REJECTED",
    category: "document",
  },
  DOCUMENT_PUBLISHED: {
    template: "DOCUMENT_PUBLISHED",
    category: "document",
  },
  COMMENT_THREAD_CREATED: {
    template: "COMMENT_THREAD_CREATED",
    category: "comment",
  },
  COMMENT_REPLY_CREATED: {
    template: "COMMENT_REPLY_CREATED",
    category: "comment",
  },
  COMMENT_THREAD_RESOLVED: {
    template: "COMMENT_THREAD_RESOLVED",
    category: "comment",
  },
  COMMENT_THREAD_RETURNED: {
    template: "COMMENT_THREAD_RETURNED",
    category: "comment",
  },
  PROJECT_MEMBER_ADDED: {
    template: "PROJECT_MEMBER_ADDED",
    category: "membership",
  },
  PROJECT_MEMBER_REMOVED: {
    template: "PROJECT_MEMBER_REMOVED",
    category: "membership",
  },
  INVITATION_ACCEPTED: {
    template: "INVITATION_ACCEPTED",
    category: "membership",
  },
};

export function getEmailEvent(type: NotificationType) {
  return EMAIL_EVENTS[type] ?? null;
}

export function areEmailNotificationsAllowed(
  category: EmailCategory,
  preferences: EmailPreferences,
) {
  if (!preferences.emailNotificationsEnabled) {
    return false;
  }

  if (category === "document") {
    return preferences.emailDocumentUpdates;
  }

  if (category === "comment") {
    return preferences.emailCommentUpdates;
  }

  return preferences.emailMembershipUpdates;
}
