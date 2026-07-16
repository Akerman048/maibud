"use client";

import { useActionState } from "react";

import type { UserRole } from "@/app/generated/prisma/client";
import { updateProfile } from "@/app/dashboard/settings/profile-actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { getUserRoleLabel } from "@/lib/user-role";
import type { ProfileActionState } from "@/types/profile";

type SettingsViewProps = {
  name: string;
  role: UserRole;
  email: string;
};

const initialState: ProfileActionState = { success: false, error: "" };

export function SettingsView({ name, role, email }: SettingsViewProps) {
  const [state, action, isPending] = useActionState(
    updateProfile,
    initialState,
  );

  return (
    <Card className="max-w-2xl p-6">
      <form action={action} className="flex flex-col gap-5">
        <div>
          <h2 className="text-lg font-semibold">Профіль користувача</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Основна інформація про акаунт
          </p>
        </div>

        <div className="grid gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="profile-name" className="text-sm font-semibold">
              Імʼя
            </label>
            <Input
              id="profile-name"
              name="name"
              defaultValue={name}
              autoComplete="name"
              minLength={2}
              maxLength={100}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <span id="profile-email-label" className="text-sm font-semibold">
              Email
            </span>
            <p
              aria-labelledby="profile-email-label"
              className="min-h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-slate-50 px-3.5 py-2 text-[15px] text-[var(--color-text-secondary)]"
            >
              {email || "Не вказано"}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span id="profile-role-label" className="text-sm font-semibold">
              Роль
            </span>
            <p aria-labelledby="profile-role-label">
              <span className="inline-flex min-h-8 items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                {getUserRoleLabel(role)}
              </span>
            </p>
          </div>
        </div>

        {state.error ? (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p role="status" className="text-sm text-emerald-700">
            Профіль оновлено.
          </p>
        ) : null}

        <div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Збереження…" : "Зберегти зміни"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
