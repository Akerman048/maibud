import { describe, expect, it } from "vitest";

import {
  areEmailNotificationsAllowed,
  getEmailEvent,
} from "@/lib/email/email-events";

const enabledPreferences = {
  emailNotificationsEnabled: true,
  emailDocumentUpdates: true,
  emailCommentUpdates: true,
  emailMembershipUpdates: true,
};

describe("email event mapping", () => {
  it.each([
    ["DOCUMENT_SUBMITTED", "DOCUMENT_SUBMITTED", "document"],
    ["DOCUMENT_VERSION_UPLOADED", "DOCUMENT_VERSION_UPLOADED", "document"],
    ["DOCUMENT_APPROVED", "DOCUMENT_APPROVED", "document"],
    ["DOCUMENT_REJECTED", "DOCUMENT_REJECTED", "document"],
    ["DOCUMENT_PUBLISHED", "DOCUMENT_PUBLISHED", "document"],
    ["COMMENT_THREAD_CREATED", "COMMENT_THREAD_CREATED", "comment"],
    ["COMMENT_REPLY_CREATED", "COMMENT_REPLY_CREATED", "comment"],
    ["COMMENT_THREAD_RESOLVED", "COMMENT_THREAD_RESOLVED", "comment"],
    ["COMMENT_THREAD_RETURNED", "COMMENT_THREAD_RETURNED", "comment"],
    ["PROJECT_MEMBER_ADDED", "PROJECT_MEMBER_ADDED", "membership"],
    ["PROJECT_MEMBER_REMOVED", "PROJECT_MEMBER_REMOVED", "membership"],
    ["INVITATION_ACCEPTED", "INVITATION_ACCEPTED", "membership"],
  ] as const)("maps %s to %s", (type, template, category) => {
    expect(getEmailEvent(type)).toEqual({ template, category });
  });

  it("does not email noisy unsupported events", () => {
    expect(getEmailEvent("DOCUMENT_UNPUBLISHED")).toBeNull();
    expect(getEmailEvent("PROJECT_ARCHIVED")).toBeNull();
  });
});

describe("email preferences", () => {
  it("allows enabled categories", () => {
    expect(areEmailNotificationsAllowed("document", enabledPreferences)).toBe(true);
    expect(areEmailNotificationsAllowed("comment", enabledPreferences)).toBe(true);
    expect(areEmailNotificationsAllowed("membership", enabledPreferences)).toBe(true);
  });

  it("denies every category when the global preference is disabled", () => {
    expect(areEmailNotificationsAllowed("document", {
      ...enabledPreferences,
      emailNotificationsEnabled: false,
    })).toBe(false);
  });

  it("denies only a disabled category", () => {
    expect(areEmailNotificationsAllowed("comment", {
      ...enabledPreferences,
      emailCommentUpdates: false,
    })).toBe(false);
    expect(areEmailNotificationsAllowed("document", {
      ...enabledPreferences,
      emailCommentUpdates: false,
    })).toBe(true);
  });
});
