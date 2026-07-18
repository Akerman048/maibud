"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { Prisma } from "@/app/generated/prisma/client";
import { AuthorizationError, requireUser } from "@/lib/auth-guard";
import {
  acceptOrganizationInvitation,
  InvitationLifecycleError,
} from "@/lib/invitation-service";
import { checkInvitationRateLimit } from "@/lib/invitation-rate-limit";
import { invitationTokenSchema } from "@/lib/invitation-validation";
import { getTrustedClientIp } from "@/lib/process-rate-limit";
import type { AcceptInvitationState } from "@/types/invitation-action";
import { signOut } from "@/auth";

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
  let roleChanged = false;

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

    const user = await requireUser();
    const result = await acceptOrganizationInvitation({
      token: tokenResult.data,
      userId: user.id,
    });
    dashboardPath = result.dashboardPath;
    roleChanged = result.roleChanged;
  } catch (error) {
    return acceptanceError(error);
  }

  if (roleChanged) {
    await signOut({ redirectTo: "/login?invitationAccepted=1" });
  }

  redirect(dashboardPath);
}
