import { describe, expect, it } from "vitest";

import { registrationSchema } from "@/lib/registration-validation";

const validRegistration = {
  firstName: " Сергій ",
  lastName: " Петренко ",
  email: " Owner@Example.COM ",
  password: "Secure123",
  confirmPassword: "Secure123",
  organizationName: " МайБуд Проєкт ",
  termsAccepted: true,
};

describe("registrationSchema", () => {
  it("accepts and normalizes a valid organization registration", () => {
    const result = registrationSchema.parse(validRegistration);

    expect(result).toMatchObject({
      firstName: "Сергій",
      lastName: "Петренко",
      email: "owner@example.com",
      organizationName: "МайБуд Проєкт",
    });
  });

  it("returns localized errors when required fields are missing", () => {
    const result = registrationSchema.safeParse({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors).toMatchObject({
        firstName: ["Ім’я обов’язкове."],
        lastName: ["Прізвище обов’язкове."],
        email: ["Email обов’язковий."],
        password: ["Пароль обов’язковий."],
        confirmPassword: ["Підтвердження пароля обов’язкове."],
        organizationName: ["Назва організації обов’язкова."],
        termsAccepted: ["Потрібно погодитися з умовами використання."],
      });
    }
  });

  it.each([
    ["short password", { password: "Sec1", confirmPassword: "Sec1" }],
    ["missing uppercase", { password: "secure123", confirmPassword: "secure123" }],
    ["missing lowercase", { password: "SECURE123", confirmPassword: "SECURE123" }],
    ["missing number", { password: "SecurePass", confirmPassword: "SecurePass" }],
    ["password mismatch", { confirmPassword: "Different123" }],
    ["invalid email", { email: "not-an-email" }],
    ["empty first name", { firstName: "   " }],
    ["empty last name", { lastName: "   " }],
    ["short organization name", { organizationName: "A" }],
    ["missing terms agreement", { termsAccepted: false }],
  ])("rejects %s", (_case, override) => {
    expect(
      registrationSchema.safeParse({
        ...validRegistration,
        ...override,
      }).success,
    ).toBe(false);
  });

  it("accepts a valid 254-character email and preserves lowercase normalization", () => {
    const email = `${"A".repeat(64)}@${"B".repeat(63)}.${"C".repeat(63)}.${"D".repeat(61)}`;
    expect(email).toHaveLength(254);

    const result = registrationSchema.parse({
      ...validRegistration,
      email,
    });

    expect(result.email).toBe(email.toLowerCase());
  });

  it("returns the dedicated field error for an email over 254 characters", () => {
    const email = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(62)}`;
    expect(email).toHaveLength(255);

    const result = registrationSchema.safeParse({
      ...validRegistration,
      email,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toContain(
        "Email не може перевищувати 254 символи.",
      );
    }
  });
});
