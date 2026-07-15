import { Resend } from "resend";

export class EmailProviderConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailProviderConfigurationError";
  }
}

export function assertEmailProviderConfigured() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (!apiKey || !from) {
    throw new EmailProviderConfigurationError(
      "RESEND_API_KEY and EMAIL_FROM are required to process email jobs",
    );
  }

  return { apiKey, from };
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const { apiKey, from } = assertEmailProviderConfigured();
  const resend = new Resend(apiKey);
  const result = await resend.emails.send({ from, to, subject, html, text });

  if (result.error) {
    throw new Error(result.error.message || "Resend rejected the email request");
  }

  if (!result.data?.id) {
    throw new Error("Resend did not return a message id");
  }

  return { providerMessageId: result.data.id };
}
