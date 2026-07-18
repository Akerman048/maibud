"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/auth";
import { getSafeInvitationCallbackPath } from "@/lib/invitation-validation";
import type { LoginActionState } from "@/types/login-action";

export async function login(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  const password = String(formData.get("password") ?? "");
  const redirectTo = getSafeInvitationCallbackPath(
    formData.get("callbackUrl"),
  );

  if (!email || !password) {
    return {
      error: "Введіть email і пароль.",
    };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo,
    });

    return {
      error: "",
    };
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return {
          error: "Неправильний email або пароль.",
        };
      }

      return {
        error: "Не вдалося виконати вхід.",
      };
    }

    throw error;
  }
}
