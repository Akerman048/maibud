"use server";

import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";

import { Prisma } from "@/app/generated/prisma/client";
import { AuthorizationError, requireAuthenticatedUser } from "@/lib/auth-guard";
import {
  acceptOrganizationInvitation,
  InvitationLifecycleError,
  registerAndAcceptOrganizationInvitation,
} from "@/lib/invitation-service";
import { checkInvitationRateLimit } from "@/lib/invitation-rate-limit";
import {
  getInvitationCallbackPath,
  invitationTokenSchema,
} from "@/lib/invitation-validation";
import { getTrustedClientIp } from "@/lib/process-rate-limit";
import type { AcceptInvitationState } from "@/types/invitation-action";
import { signIn, signOut, updateSession } from "@/auth";
import { INVITATION_INTENT_COOKIE } from "@/lib/invitation-intent";

function acceptanceError(error: unknown): AcceptInvitationState {
  if (error instanceof InvitationLifecycleError) {
    return { error: error.message, success: false };
  }

  if (error instanceof AuthorizationError) {
    return {
      error:
        error.status === 401
          ? "Увійдіть у систему та відкрийте запрошення повторно."
          : "Недостатньо прав для цієї дії.",
      success: false,
    };
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2002" || error.code === "P2034")
  ) {
    return {
      error: "Запрошення вже змінилося. Оновіть сторінку та повторіть дію.",
      success: false,
    };
  }

  console.error("Invitation acceptance failed", error);
  return { error: "Не вдалося прийняти запрошення.", success: false };
}

export async function acceptInvitation(
  _previousState: AcceptInvitationState,
  formData: FormData,
): Promise<AcceptInvitationState> {
  let dashboardPath = "/dashboard";

  try {
    const clientIp = getTrustedClientIp(await headers());
    const rateLimit = checkInvitationRateLimit("accept", clientIp);
    if (!rateLimit.allowed) {
      return {
        error: `Забагато спроб. Повторіть через ${rateLimit.retryAfterSeconds} с.`,
        success: false,
      };
    }

    const tokenResult = invitationTokenSchema.safeParse(formData.get("token"));
    if (!tokenResult.success) {
      return { error: "Запрошення недійсне.", success: false };
    }

    const user = await requireAuthenticatedUser();
    const result = await acceptOrganizationInvitation({
      token: tokenResult.data,
      userId: user.id,
    });
    dashboardPath = result.dashboardPath;
    (await cookies()).delete(INVITATION_INTENT_COOKIE);
    await updateSession({});
  } catch (error) {
    return acceptanceError(error);
  }

  redirect(dashboardPath);
}

export async function signOutFromInvitation(formData: FormData) {
  const token = invitationTokenSchema.safeParse(formData.get("token"));
  const redirectTo = token.success
    ? getInvitationCallbackPath(token.data) ?? "/login"
    : "/login";

  await signOut({ redirectTo });
}

export async function registerInvitationAccount(
  _previousState: AcceptInvitationState,
  formData: FormData,
): Promise<AcceptInvitationState> {
  let password = "";
  let result: Awaited<
    ReturnType<typeof registerAndAcceptOrganizationInvitation>
  >;
  try {
    const clientIp = getTrustedClientIp(await headers());
    const rateLimit = checkInvitationRateLimit("accept", clientIp);
    if (!rateLimit.allowed) {
      return {
        error: `Забагато спроб. Повторіть через ${rateLimit.retryAfterSeconds} с.`,
        success: false,
      };
    }

    password = String(formData.get("password") ?? "");
    result = await registerAndAcceptOrganizationInvitation({
      token: String(formData.get("token") ?? ""),
      name: String(formData.get("name") ?? ""),
      password,
      confirmPassword: String(formData.get("confirmPassword") ?? ""),
    });
  } catch (error) {
    return acceptanceError(error);
  }

  // A fresh credentials sign-in builds the JWT from the role and membership
  // committed by the serializable invitation transaction.
  (await cookies()).delete(INVITATION_INTENT_COOKIE);
  await signIn("credentials", {
    email: result.email,
    password,
    redirectTo: result.dashboardPath,
  });
  return { error: "", success: true };
}
