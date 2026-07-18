"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { Prisma } from "@/app/generated/prisma/client";
import { updateSession } from "@/auth";
import { requireAuthenticatedUser } from "@/lib/auth-guard";
import {
  completeGoogleOrganizationRegistration,
  GoogleOnboardingError,
} from "@/lib/organization-registration";
import {
  googleOnboardingSchema,
  type GoogleOnboardingState,
} from "@/lib/google-onboarding-validation";
import { getTrustedClientIp } from "@/lib/process-rate-limit";
import { checkRegistrationRateLimit } from "@/lib/registration-rate-limit";
import {
  getInvitationIntentToken,
  INVITATION_INTENT_COOKIE,
} from "@/lib/invitation-intent";

export async function completeGoogleOnboarding(
  _previousState: GoogleOnboardingState,
  formData: FormData,
): Promise<GoogleOnboardingState> {
  const rateLimit = checkRegistrationRateLimit(
    getTrustedClientIp(await headers()),
  );
  if (!rateLimit.allowed) {
    return { error: "Забагато спроб. Спробуйте пізніше." };
  }

  const parsed = googleOnboardingSchema.safeParse({
    organizationName: formData.get("organizationName"),
    termsAccepted: formData.get("termsAccepted") === "on",
  });
  if (!parsed.success) {
    return {
      error: "Перевірте введені дані.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const user = await requireAuthenticatedUser();
    const invitationToken = getInvitationIntentToken(
      (await cookies()).get(INVITATION_INTENT_COOKIE)?.value,
    );
    await completeGoogleOrganizationRegistration({
      userId: user.id,
      organizationName: parsed.data.organizationName,
      invitationToken: invitationToken ?? undefined,
    });
    await updateSession({});
  } catch (error) {
    if (
      error instanceof GoogleOnboardingError ||
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2002" || error.code === "P2034"))
    ) {
      return {
        error: "Реєстрація вже змінилася. Оновіть сторінку та повторіть дію.",
      };
    }
    throw error;
  }

  redirect("/dashboard");
}
