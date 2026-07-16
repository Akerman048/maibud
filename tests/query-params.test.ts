import { describe, expect, it } from "vitest";
import {
  getPaginationMeta,
  normalizeBooleanFilter,
  normalizeSearchQuery,
  parseDateParam,
  parseDateEndParam,
  parsePage,
  parsePageSize,
  parsePositiveInteger,
} from "@/lib/query-params";

describe("query parameter helpers", () => {
  it("parses positive page numbers", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-2")).toBe(1);
    expect(parsePage("1.5")).toBe(1);
    expect(parsePositiveInteger("nope", 7)).toBe(7);
  });

  it("allows only supported page sizes", () => {
    expect(parsePageSize("10")).toBe(10);
    expect(parsePageSize("20")).toBe(20);
    expect(parsePageSize("50")).toBe(50);
    expect(parsePageSize("100")).toBe(20);
  });

  it("normalizes search without exceeding 200 characters", () => {
    expect(normalizeSearchQuery("  gas   office \n Kyiv ")).toBe("gas office Kyiv");
    expect(normalizeSearchQuery("x".repeat(250))).toHaveLength(200);
    expect(normalizeSearchQuery("   ")).toBe("");
  });

  it("normalizes tri-state boolean filters", () => {
    expect(normalizeBooleanFilter("true")).toBe("true");
    expect(normalizeBooleanFilter("false")).toBe("false");
    expect(normalizeBooleanFilter("yes")).toBe("all");
  });

  it("parses valid dates and rejects invalid dates", () => {
    expect(parseDateParam("2026-07-16")?.getUTCFullYear()).toBe(2026);
    expect(parseDateParam("not-a-date")).toBeNull();
    expect(parseDateParam("2026-02-30")).toBeNull();
    expect(parseDateParam(undefined)).toBeNull();
    expect(parseDateEndParam("2026-07-16")?.getUTCHours()).toBe(23);
  });

  it("builds metadata for empty and populated results", () => {
    expect(getPaginationMeta({ page: 1, pageSize: 20, total: 0 })).toEqual({
      page: 1, pageSize: 20, total: 0, totalPages: 0,
      hasNextPage: false, hasPreviousPage: false,
    });
    expect(getPaginationMeta({ page: 2, pageSize: 20, total: 41 })).toMatchObject({
      totalPages: 3, hasNextPage: true, hasPreviousPage: true,
    });
  });

  it("preserves an above-total requested page", () => {
    expect(getPaginationMeta({ page: 8, pageSize: 20, total: 25 })).toMatchObject({
      page: 8, totalPages: 2, hasNextPage: false, hasPreviousPage: true,
    });
  });
});
