import { describe, expect, it } from "vitest";

import { googleOnboardingSchema } from "@/lib/google-onboarding-validation";

describe("Google organization onboarding validation", () => {
  it("normalizes a real organization name and requires terms", () => {
    expect(
      googleOnboardingSchema.parse({
        organizationName: "  МайБуд Проєкт  ",
        termsAccepted: true,
      }),
    ).toEqual({ organizationName: "МайБуд Проєкт", termsAccepted: true });

    expect(
      googleOnboardingSchema.safeParse({
        organizationName: "МайБуд Проєкт",
        termsAccepted: false,
      }).success,
    ).toBe(false);
  });

  it.each(["", "A", "x".repeat(101)])(
    "rejects invalid organization name %j",
    (organizationName) => {
      expect(
        googleOnboardingSchema.safeParse({
          organizationName,
          termsAccepted: true,
        }).success,
      ).toBe(false);
    },
  );
});
