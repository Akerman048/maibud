import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { getSafeAuthErrorMessage } from "@/lib/auth-error-message";
import { getSafeInvitationCallbackPath } from "@/lib/invitation-validation";

describe("Google auth callback and UI safety", () => {
  it.each([
    ["/dashboard", "/dashboard"],
    [`/invite/${"a".repeat(43)}`, `/invite/${"a".repeat(43)}`],
    ["https://evil.example/invite/token", "/dashboard"],
    ["//evil.example/path", "/dashboard"],
    ["%2F%2Fevil.example", "/dashboard"],
    ["/invite/../../evil", "/dashboard"],
    ["/invite/abc\\evil", "/dashboard"],
    ["/invite/abc\u0000evil", "/dashboard"],
  ])("maps callback %j to %j", (input, expected) => {
    expect(getSafeInvitationCallbackPath(input)).toBe(expected);
  });

  it("maps known and unknown Auth.js errors to safe localized copy", () => {
    expect(getSafeAuthErrorMessage("OAuthAccountNotLinked")).toBe(
      "Не вдалося безпечно пов’язати облікові записи. Увійдіть іншим способом або зверніться до підтримки.",
    );
    expect(getSafeAuthErrorMessage("AccessDenied")).toMatch(/відхилено/);
    expect(getSafeAuthErrorMessage("internal database id 123")).toBe(
      "Не вдалося виконати вхід через Google.",
    );
  });

  it("renders the shared non-submitting Google control on login and registration", () => {
    const login = readFileSync("app/login/page.tsx", "utf8");
    const registration = readFileSync("app/register/page.tsx", "utf8");
    const button = readFileSync("components/auth/GoogleSignInButton.tsx", "utf8");

    expect(login).toContain("<GoogleSignInButton callbackUrl={callbackUrl} />");
    expect(registration).toContain("<GoogleSignInButton callbackUrl={callbackUrl} />");
    expect(button).toContain('type="submit"');
    expect(button).toContain("disabled={isPending}");
    expect(button).toContain('name="callbackUrl"');
    expect(button).toContain("Продовжити з Google");
  });
});
