import { describe, expect, it } from "vitest";

import { getActivityHref } from "@/lib/activity-href";

describe("activity href", () => {
  it("maps project and document activity to role-owned routes", () => {
    expect(getActivityHref({ role: "HEAD", entityType: "PROJECT", entityId: "p1", projectId: "p1" })).toBe("/dashboard/head/projects/p1");
    expect(getActivityHref({ role: "EXPERT", entityType: "DOCUMENT", entityId: "d1", projectId: "p1" })).toBe("/dashboard/expert/projects/p1");
    expect(getActivityHref({ role: "ARCHIVIST", entityType: "PROJECT", entityId: "p1", projectId: "p1" })).toBe("/dashboard/archivist/projects/p1");
  });

  it("maps discussion and HEAD membership entities without trusting stored URLs", () => {
    expect(getActivityHref({ role: "DESIGNER", entityType: "COMMENT_THREAD", entityId: "t1", projectId: "p1" })).toBe("/dashboard/designer/comments/t1");
    expect(getActivityHref({ role: "HEAD", entityType: "ORGANIZATION_MEMBER", entityId: "m1", projectId: null })).toBe("/dashboard/head/members");
    expect(getActivityHref({ role: "HEAD", entityType: "INVITATION", entityId: "i1", projectId: null })).toBe("/dashboard/head/members");
  });

  it("returns null for clients, unknown entities and missing route context", () => {
    expect(getActivityHref({ role: "CLIENT", entityType: "PROJECT", entityId: "p1", projectId: "p1" })).toBeNull();
    expect(getActivityHref({ role: "EXPERT", entityType: "UNKNOWN", entityId: "https://evil.example", projectId: null })).toBeNull();
    expect(getActivityHref({ role: "EXPERT", entityType: "DOCUMENT", entityId: "https://evil.example", projectId: null })).toBeNull();
  });

  it("encodes database ids as path segments", () => {
    expect(getActivityHref({ role: "HEAD", entityType: "PROJECT", entityId: "//evil.example", projectId: null })).toBe("/dashboard/head/projects/%2F%2Fevil.example");
  });
});
