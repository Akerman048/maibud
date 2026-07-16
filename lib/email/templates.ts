import type { EmailTemplate } from "@/app/generated/prisma/client";

type EmailPayload = Record<string, unknown>;

export class EmailTemplateConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailTemplateConfigurationError";
  }
}

const SUBJECTS: Record<EmailTemplate, string> = {
  INVITATION_CREATED: "Запрошення до ExpertDesk",
  INVITATION_ACCEPTED: "Запрошення прийнято",
  DOCUMENT_SUBMITTED: "Документ подано на перевірку",
  DOCUMENT_VERSION_UPLOADED: "Завантажено нову версію документа",
  DOCUMENT_APPROVED: "Документ погоджено",
  DOCUMENT_REJECTED: "Документ повернено на доопрацювання",
  DOCUMENT_PUBLISHED: "Документ опубліковано",
  COMMENT_THREAD_CREATED: "Нове зауваження до документа",
  COMMENT_REPLY_CREATED: "Нова відповідь у зауваженні",
  COMMENT_THREAD_RESOLVED: "Зауваження позначено виконаним",
  COMMENT_THREAD_RETURNED: "Зауваження повернено в роботу",
  PROJECT_MEMBER_ADDED: "Доступ до проєкту надано",
  PROJECT_MEMBER_REMOVED: "Доступ до проєкту змінено",
  PROJECT_ARCHIVED: "Проєкт переміщено в архів",
  PROJECT_RESTORED: "Проєкт відновлено з архіву",
  DOCUMENT_ARCHIVED: "Документ переміщено в архів",
  DOCUMENT_RESTORED: "Документ відновлено з архіву",
};

function getString(payload: EmailPayload, key: string, fallback = "") {
  const value = payload[key];
  return typeof value === "string" ? value : fallback;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character];
  });
}

export function getEmailSubject(template: EmailTemplate) {
  return SUBJECTS[template];
}

export function getValidatedAppUrl(value = process.env.APP_URL) {
  if (!value) {
    throw new EmailTemplateConfigurationError(
      "APP_URL is required for email rendering",
    );
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new EmailTemplateConfigurationError(
      "APP_URL must be an HTTP(S) origin",
    );
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new EmailTemplateConfigurationError(
      "APP_URL must be an HTTP(S) origin",
    );
  }

  return url.origin;
}

export function toAbsoluteInternalUrl(href: string, appUrl?: string) {
  if (!/^\/(?!\/)/.test(href)) {
    throw new Error("Email CTA must be a safe internal path");
  }

  return new URL(href, `${getValidatedAppUrl(appUrl)}/`).toString();
}

export function renderEmailTemplate(
  template: EmailTemplate,
  payload: EmailPayload,
  options: { appUrl?: string } = {},
) {
  const subject = getEmailSubject(template);
  const recipientName = getString(payload, "recipientName", "користувачу");
  const invitation = template === "INVITATION_CREATED";
  const message = invitation
    ? `Вас запрошено до організації «${getString(payload, "organizationName", "ExpertDesk")}» з роллю ${getString(payload, "role", "учасника")}.`
    : getString(payload, "message", subject);
  const href = getString(payload, "href");
  const ctaUrl = href ? toAbsoluteInternalUrl(href, options.appUrl) : null;
  const projectName = invitation ? getString(payload, "projectName") : "";
  const expiresAt = invitation ? getString(payload, "expiresAt") : "";
  const details = [
    projectName ? `Проєкт: ${projectName}` : "",
    expiresAt ? `Запрошення дійсне до: ${expiresAt}` : "",
  ].filter(Boolean);
  const text = [
    `Вітаємо, ${recipientName}!`,
    "",
    message,
    ...details.map((detail) => `\n${detail}`),
    ctaUrl ? `\nВідкрити ExpertDesk: ${ctaUrl}` : "",
  ].filter(Boolean).join("\n");

  const html = `<!doctype html>
<html lang="uk">
  <body style="margin:0;background:#f5f7fa;font-family:Arial,sans-serif;color:#1f2937">
    <main style="max-width:600px;margin:24px auto;background:#fff;padding:32px;border-radius:12px">
      <p style="font-size:18px;font-weight:700">ExpertDesk</p>
      <h1 style="font-size:22px">${escapeHtml(subject)}</h1>
      <p>Вітаємо, ${escapeHtml(recipientName)}!</p>
      <p>${escapeHtml(message)}</p>
      ${details.map((detail) => `<p>${escapeHtml(detail)}</p>`).join("")}
      ${ctaUrl ? `<p><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px">Відкрити ExpertDesk</a></p>` : ""}
      <p style="font-size:12px;color:#6b7280">Це автоматичне повідомлення ExpertDesk.</p>
    </main>
  </body>
</html>`;

  return { subject, html, text };
}
