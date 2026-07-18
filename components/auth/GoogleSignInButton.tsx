"use client";

import { useActionState } from "react";
import { FcGoogle } from "react-icons/fc";

import {
  googleSignIn,
  type GoogleSignInState,
} from "@/app/login/google-actions";
import { Button } from "@/components/ui/Button";

const initialState: GoogleSignInState = { error: "" };

export function GoogleSignInButton({
  callbackUrl = "/dashboard",
}: {
  callbackUrl?: string;
}) {
  const [state, action, isPending] = useActionState(
    googleSignIn,
    initialState,
  );

  return (
    <div className="mt-5">
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-[var(--color-border)]" />
        <span className="text-sm text-[var(--color-text-secondary)]">або</span>
        <span className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      <form action={action} className="mt-5">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <Button
          type="submit"
          variant="secondary"
          disabled={isPending}
          className="w-full gap-2"
        >
          <FcGoogle aria-hidden="true" className="size-5" />
          {isPending ? "Перенаправлення..." : "Продовжити з Google"}
        </Button>
      </form>

      {state.error && (
        <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {state.error}
        </p>
      )}
    </div>
  );
}
