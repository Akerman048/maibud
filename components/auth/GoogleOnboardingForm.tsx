"use client";

import { useActionState } from "react";

import { completeGoogleOnboarding } from "@/app/onboarding/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { GoogleOnboardingState } from "@/lib/google-onboarding-validation";

const initialState: GoogleOnboardingState = { error: "" };

export function GoogleOnboardingForm() {
  const [state, action, isPending] = useActionState(
    completeGoogleOnboarding,
    initialState,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="organizationName" className="text-sm font-semibold">
          Назва організації
        </label>
        <Input
          id="organizationName"
          name="organizationName"
          autoComplete="organization"
          minLength={2}
          maxLength={100}
          required
          disabled={isPending}
          aria-invalid={Boolean(state.fieldErrors?.organizationName)}
          aria-describedby={
            state.fieldErrors?.organizationName
              ? "organizationName-error"
              : undefined
          }
        />
        {state.fieldErrors?.organizationName && (
          <p id="organizationName-error" className="text-sm font-medium text-red-700">
            {state.fieldErrors.organizationName[0]}
          </p>
        )}
      </div>

      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <input
          name="termsAccepted"
          type="checkbox"
          required
          disabled={isPending}
          className="mt-0.5 size-5 shrink-0 rounded border-[var(--color-border-strong)] accent-[var(--color-accent)]"
        />
        <span>Я погоджуюся з умовами використання.</span>
      </label>
      {state.fieldErrors?.termsAccepted && (
        <p className="text-sm font-medium text-red-700">
          {state.fieldErrors.termsAccepted[0]}
        </p>
      )}

      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Створення..." : "Створити організацію"}
      </Button>
    </form>
  );
}
