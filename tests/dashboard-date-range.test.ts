import { describe, expect, it } from "vitest";

import {
  getDashboardDateRangeStart,
  getDashboardPeriodDescription,
  parseDashboardDateRange,
} from "@/lib/dashboard-date-range";

describe("dashboard date ranges", () => {
  it("accepts supported values and safely reads array params", () => {
    expect(parseDashboardDateRange("7d")).toBe("7d");
    expect(parseDashboardDateRange("30d")).toBe("30d");
    expect(parseDashboardDateRange("90d")).toBe("90d");
    expect(parseDashboardDateRange("all")).toBe("all");
    expect(parseDashboardDateRange(["7d", "all"])).toBe("7d");
  });

  it("falls back to 30 days for missing and invalid values", () => {
    expect(parseDashboardDateRange(undefined)).toBe("30d");
    expect(parseDashboardDateRange("year")).toBe("30d");
    expect(parseDashboardDateRange([])).toBe("30d");
  });

  it("subtracts exact UTC-safe day intervals without mutating now", () => {
    const now = new Date("2026-07-16T23:45:30.000Z");
    expect(getDashboardDateRangeStart("7d", now)?.toISOString()).toBe(
      "2026-07-09T23:45:30.000Z",
    );
    expect(getDashboardDateRangeStart("30d", now)?.toISOString()).toBe(
      "2026-06-16T23:45:30.000Z",
    );
    expect(getDashboardDateRangeStart("90d", now)?.toISOString()).toBe(
      "2026-04-17T23:45:30.000Z",
    );
    expect(now.toISOString()).toBe("2026-07-16T23:45:30.000Z");
  });

  it("returns null for all time and produces period descriptions", () => {
    const now = new Date("2026-07-16T00:00:00.000Z");
    expect(getDashboardDateRangeStart("all", now)).toBeNull();
    expect(getDashboardPeriodDescription("30d")).toBe("За останні 30 днів");
    expect(getDashboardPeriodDescription("all")).toBe("За весь час");
  });
});
