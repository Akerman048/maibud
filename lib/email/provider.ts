import "server-only";

export {
  assertEmailProviderConfigured,
  EmailProviderConfigurationError,
  sendEmail,
} from "@/lib/email/provider-service";
