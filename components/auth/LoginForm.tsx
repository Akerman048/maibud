"use client";

import { useActionState } from "react";

import { login } from "@/app/login/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { LoginActionState } from "@/types/login-action";

const initialState: LoginActionState = {
  error: "",
};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    login,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-semibold">
          Email
        </label>

        <Input
          id="email"
          name="email"
          type="email"
          placeholder="name@example.com"
          autoComplete="email"
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
          placeholder="Введіть пароль"
          autoComplete="current-password"
          minLength={8}
          required
          disabled={isPending}
        />
      </div>

      {state.error && (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
        >
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Вхід..." : "Увійти"}
      </Button>
    </form>
  );
}
