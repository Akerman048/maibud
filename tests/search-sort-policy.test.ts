import { describe, expect, it } from "vitest";
import {
  getDocumentSortField,
  getNotificationSortField,
  getProjectSortField,
} from "@/lib/search-sort-policy";

describe("search sort allowlists", () => {
  it("accepts project fields and rejects arbitrary Prisma keys", () => {
    expect(getProjectSortField("deadline")).toBe("deadline");
    expect(getProjectSortField("organizationId")).toBe("createdAt");
    expect(getProjectSortField("__proto__")).toBe("createdAt");
  });

  it("accepts document fields with a safe fallback", () => {
    expect(getDocumentSortField("reviewedAt")).toBe("reviewedAt");
    expect(getDocumentSortField("authorId")).toBe("createdAt");
  });

  it("keeps notification sorting intentionally narrow", () => {
    expect(getNotificationSortField("createdAt")).toBe("createdAt");
    expect(getNotificationSortField("userId")).toBe("createdAt");
  });
});
