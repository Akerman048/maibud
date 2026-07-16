import { describe, expect, it } from "vitest";

import {
  getArchivedProjectHref,
  getNotificationHref,
  getUniqueNotificationRecipientIds,
  isNotificationOwnedByUser,
  isSafeNotificationHref,
  shouldNotifyActor,
} from "@/lib/notification-policy";

describe("notification ownership and recipients", () => {
  it("checks notification ownership by user id", () => {
    expect(isNotificationOwnedByUser({
      notificationUserId: "user-1",
      currentUserId: "user-1",
    })).toBe(true);
    expect(isNotificationOwnedByUser({
      notificationUserId: "user-1",
      currentUserId: "user-2",
    })).toBe(false);
  });

  it("skips actor self-notifications", () => {
    expect(shouldNotifyActor({ recipientUserId: "user-1", actorUserId: "user-1" })).toBe(false);
    expect(shouldNotifyActor({ recipientUserId: "user-2", actorUserId: "user-1" })).toBe(true);
  });

  it("deduplicates recipients and removes the actor", () => {
    expect(getUniqueNotificationRecipientIds(
      ["user-1", "user-2", "user-2", "user-3"],
      "user-1",
    )).toEqual(["user-2", "user-3"]);
    expect(getUniqueNotificationRecipientIds([], "user-1")).toEqual([]);
  });
});

describe("notification href policy", () => {
  it("accepts safe internal hrefs", () => {
    expect(isSafeNotificationHref("/dashboard/expert/comments/thread-1")).toBe(true);
  });

  it.each(["//evil.com", "https://evil.com", "javascript:alert(1)"])(
    "rejects unsafe href %s",
    (href) => expect(isSafeNotificationHref(href)).toBe(false),
  );

  it("generates role-based project and thread hrefs", () => {
    expect(getNotificationHref({
      destination: "PROJECT",
      role: "CLIENT",
      projectId: "project-1",
    })).toBe("/dashboard/client/projects/project-1");
    expect(getNotificationHref({
      destination: "COMMENT_THREAD",
      role: "EXPERT",
      commentThreadId: "thread-1",
    })).toBe("/dashboard/expert/comments/thread-1");
  });

  it("returns null for missing or unsupported entities", () => {
    expect(getNotificationHref({
      destination: "PROJECT",
      role: "HEAD",
      projectId: null,
    })).toBeNull();
    expect(getNotificationHref({
      destination: "COMMENT_THREAD",
      role: "CLIENT",
      commentThreadId: "thread-1",
    })).toBeNull();
  });

  it("generates safe role-aware archive destinations", () => {
    expect(getArchivedProjectHref("HEAD", "project-1")).toBe(
      "/dashboard/head/archive/project-1",
    );
    expect(getArchivedProjectHref("ARCHIVIST", "project-1")).toBe(
      "/dashboard/archivist/archive/project-1",
    );
    expect(getArchivedProjectHref("DESIGNER", "project-1")).toBe(
      "/dashboard/designer/archive/project-1",
    );
    expect(isSafeNotificationHref(
      getArchivedProjectHref("HEAD", "project-1"),
    )).toBe(true);
  });
});
