import { describe, expect, it } from "vitest";

import {
  getValidatedAppUrl,
  renderEmailTemplate,
  toAbsoluteInternalUrl,
} from "@/lib/email/templates";

const appUrl = "https://expert-desk.example";

describe("email templates", () => {
  it("renders a subject, escaped HTML and a plain-text fallback", () => {
    const result = renderEmailTemplate("DOCUMENT_SUBMITTED", {
      recipientName: "Олег <script>alert(1)</script>",
      message: "Документ <b>готовий</b>",
      href: "/dashboard/expert/projects/project-1",
    }, { appUrl });

    expect(result.subject).toBe("Документ подано на перевірку");
    expect(result.html).toContain("Олег &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(result.html).toContain("Документ &lt;b&gt;готовий&lt;/b&gt;");
    expect(result.html).not.toContain("<script>");
    expect(result.text).toContain(
      "https://expert-desk.example/dashboard/expert/projects/project-1",
    );
  });

  it("renders invitation details and its one-time internal URL", () => {
    const result = renderEmailTemplate("INVITATION_CREATED", {
      recipientName: "Андрій",
      organizationName: "ExpertDesk Demo",
      role: "CLIENT",
      projectName: "Проєкт A",
      expiresAt: "2026-07-20T10:00:00.000Z",
      href: "/invite/raw-token-for-test",
    }, { appUrl });

    expect(result.subject).toBe("Запрошення до ExpertDesk");
    expect(result.text).toContain("ExpertDesk Demo");
    expect(result.text).toContain("CLIENT");
    expect(result.text).toContain("Проєкт A");
    expect(result.html).toContain(
      "https://expert-desk.example/invite/raw-token-for-test",
    );
  });

  it.each(["https://evil.example/path", "//evil.example/path", "javascript:alert(1)"])(
    "blocks unsafe CTA %s",
    (href) => {
      expect(() => toAbsoluteInternalUrl(href, appUrl)).toThrow(
        "Email CTA must be a safe internal path",
      );
    },
  );

  it("validates APP_URL", () => {
    expect(getValidatedAppUrl("http://localhost:3000/path")).toBe(
      "http://localhost:3000",
    );
    expect(() => getValidatedAppUrl("ftp://example.com")).toThrow(
      "APP_URL must be an HTTP(S) origin",
    );
    expect(() => getValidatedAppUrl("")).toThrow(
      "APP_URL is required for email rendering",
    );
  });
});
