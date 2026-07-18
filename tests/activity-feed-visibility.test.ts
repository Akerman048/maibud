import { describe, expect, it } from "vitest";

import { getVisibleActivity } from "@/lib/activity-feed-visibility";

describe("activity feed visibility", () => {
  const activity = ["one", "two", "three", "four", "five"];

  it("shows only the first three entries while collapsed", () => {
    expect(getVisibleActivity(activity, false)).toEqual(["one", "two", "three"]);
  });

  it("shows every entry while expanded", () => {
    expect(getVisibleActivity(activity, true)).toEqual(activity);
  });
});
