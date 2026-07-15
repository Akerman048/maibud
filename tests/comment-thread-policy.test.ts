import { describe, expect, it } from "vitest";

import {
  canCreateCommentThread,
  canDeleteCommentMessage,
  canMarkCommentThreadResolved,
  canReplyToCommentThread,
  canReturnCommentThread,
  mapCommentThreadStatus,
} from "@/lib/comment-thread-policy";

describe("comment thread policy", () => {
  it("allows only EXPERT to create a thread", () => {
    expect(canCreateCommentThread("EXPERT")).toBe(true);

    for (const role of ["HEAD", "DESIGNER", "ARCHIVIST", "CLIENT"] as const) {
      expect(canCreateCommentThread(role)).toBe(false);
    }
  });

  it("allows EXPERT and DESIGNER to reply to OPEN threads", () => {
    expect(canReplyToCommentThread({ role: "EXPERT", status: "OPEN" })).toBe(true);
    expect(canReplyToCommentThread({ role: "DESIGNER", status: "OPEN" })).toBe(true);
  });

  it("does not allow replies to RESOLVED threads", () => {
    expect(canReplyToCommentThread({ role: "EXPERT", status: "RESOLVED" })).toBe(false);
    expect(canReplyToCommentThread({ role: "DESIGNER", status: "RESOLVED" })).toBe(false);
  });

  it("allows DESIGNER to resolve OPEN and RETURNED threads", () => {
    expect(canMarkCommentThreadResolved({ role: "DESIGNER", status: "OPEN" })).toBe(true);
    expect(canMarkCommentThreadResolved({ role: "DESIGNER", status: "RETURNED" })).toBe(true);
    expect(canMarkCommentThreadResolved({ role: "EXPERT", status: "OPEN" })).toBe(false);
  });

  it("allows only EXPERT to return a RESOLVED thread", () => {
    expect(canReturnCommentThread({ role: "EXPERT", status: "RESOLVED" })).toBe(true);

    for (const role of ["HEAD", "DESIGNER", "ARCHIVIST", "CLIENT"] as const) {
      expect(canReturnCommentThread({ role, status: "RESOLVED" })).toBe(false);
    }
  });

  it("allows deleting an own recent message", () => {
    const now = new Date("2026-07-15T12:15:00.000Z");

    expect(canDeleteCommentMessage({
      role: "EXPERT",
      actorUserId: "user-1",
      authorId: "user-1",
      createdAt: new Date("2026-07-15T12:01:00.000Z"),
      deletedAt: null,
      now,
    })).toBe(true);
  });

  it("denies deleting another user's, expired, or already deleted message", () => {
    const now = new Date("2026-07-15T12:30:00.000Z");
    const base = {
      role: "DESIGNER" as const,
      actorUserId: "user-1",
      authorId: "user-1",
      createdAt: new Date("2026-07-15T12:20:00.000Z"),
      deletedAt: null,
      now,
    };

    expect(canDeleteCommentMessage({ ...base, authorId: "user-2" })).toBe(false);
    expect(canDeleteCommentMessage({ ...base, createdAt: new Date("2026-07-15T12:00:00.000Z") })).toBe(false);
    expect(canDeleteCommentMessage({ ...base, deletedAt: new Date("2026-07-15T12:25:00.000Z") })).toBe(false);
  });

  it("maps database statuses to UI values", () => {
    expect(mapCommentThreadStatus("OPEN")).toBe("open");
    expect(mapCommentThreadStatus("RESOLVED")).toBe("resolved");
    expect(mapCommentThreadStatus("RETURNED")).toBe("returned");
  });
});
