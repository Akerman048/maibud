"use client";

import { useActionState } from "react";

import {
  acceptInvitation,
  type AcceptInvitationState,
} from "@/app/invite/[token]/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const initialState: AcceptInvitationState = {
  error: "",
  success: false,
};

export function AcceptInvitationForm({
  token,
  email,
  isAuthenticated,
}: {
  token: string;
  email: string;
  isAuthenticated: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    acceptInvitation,
    initialState,
  );

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />

      <div className="flex flex-col gap-2">
        <label htmlFor="invitation-email" className="text-sm font-semibold">
          Email
        </label>
        <Input
          id="invitation-email"
          type="email"
          value={email}
          readOnly
          disabled
        />
      </div>

      {!isAuthenticated && (
        <>
          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="text-sm font-semibold">
              Ім’я
            </label>
            <Input
              id="name"
              name="name"
              minLength={2}
              maxLength={100}
              autoComplete="name"
              required
              disabled={isPending}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-semibold">
              Пароль
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              minLength={10}
              maxLength={128}
              autoComplete="new-password"
              required
              disabled={isPending}
            />
            <p className="text-xs text-[var(--color-text-secondary)]">
              Щонайменше 10 символів, велика і мала літери та цифра.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="confirmPassword"
              className="text-sm font-semibold"
            >
              Підтвердження пароля
            </label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              minLength={10}
              maxLength={128}
              autoComplete="new-password"
              required
              disabled={isPending}
            />
          </div>
        </>
      )}

      {isAuthenticated && (
        <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Запрошення буде прийнято поточним обліковим записом. Його email має
          збігатися із запрошенням.
        </p>
      )}

      {state.error && (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
        >
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Прийняття..." : "Прийняти запрошення"}
      </Button>
    </form>
  );
}
