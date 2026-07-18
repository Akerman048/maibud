"use server";

import { AuthError } from "next-auth";
import { cookies } from "next/headers";

import { signIn } from "@/auth";
import { getGoogleOAuthCredentials } from "@/lib/google-oauth";
import { getSafeInvitationCallbackPath } from "@/lib/invitation-validation";
import {
  INVITATION_INTENT_COOKIE,
  INVITATION_INTENT_MAX_AGE_SECONDS,
  parseInvitationIntentPath,
} from "@/lib/invitation-intent";

export type GoogleSignInState = { error: string };

export async function googleSignIn(
  _previousState: GoogleSignInState,
  formData: FormData,
): Promise<GoogleSignInState> {
  const redirectTo = getSafeInvitationCallbackPath(
    formData.get("callbackUrl"),
  );
  const invitationIntent = parseInvitationIntentPath(redirectTo);

  if (!getGoogleOAuthCredentials()) {
    return { error: "Вхід через Google тимчасово недоступний." };
  }

  try {
    const cookieStore = await cookies();
    if (invitationIntent) {
      cookieStore.set(INVITATION_INTENT_COOKIE, invitationIntent, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: INVITATION_INTENT_MAX_AGE_SECONDS,
      });
    } else {
      cookieStore.delete(INVITATION_INTENT_COOKIE);
    }
    await signIn("google", { redirectTo });
    return { error: "" };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Не вдалося виконати вхід через Google." };
    }
    throw error;
  }
}
