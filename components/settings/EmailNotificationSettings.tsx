"use client";

import { useActionState, useState } from "react";

import { updateEmailNotificationSettings } from "@/app/dashboard/settings/email-actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { EmailSettings, EmailSettingsActionState } from "@/types/email";
import { BRAND_NAME } from "@/lib/brand";

const initialState: EmailSettingsActionState = { success: false, error: "" };

function Toggle({
  name,
  label,
  description,
  defaultChecked,
  disabled = false,
}: {
  name: keyof EmailSettings;
  label: string;
  description: string;
  defaultChecked: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-start justify-between gap-4 py-3">
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-1 block text-sm text-[var(--color-text-secondary)]">
          {description}
        </span>
      </span>
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="mt-1 size-5 accent-[var(--color-accent)]"
      />
      {disabled && defaultChecked ? (
        <input type="hidden" name={name} value="on" />
      ) : null}
    </label>
  );
}

export function EmailNotificationSettings({
  settings,
}: {
  settings: EmailSettings;
}) {
  const [enabled, setEnabled] = useState(settings.emailNotificationsEnabled);
  const [state, action, isPending] = useActionState(
    updateEmailNotificationSettings,
    initialState,
  );

  return (
    <Card className="max-w-2xl p-6">
      <form action={action} className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">Email-сповіщення</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Оберіть події, про які {BRAND_NAME} повідомлятиме електронною поштою.
          </p>
        </div>

        <div className="divide-y divide-[var(--color-border)]">
          <label className="flex items-start justify-between gap-4 py-3">
            <span>
              <span className="block text-sm font-semibold">
                Увімкнути email-сповіщення
              </span>
              <span className="mt-1 block text-sm text-[var(--color-text-secondary)]">
                Головний перемикач для всіх листів про події.
              </span>
            </span>
            <input
              type="checkbox"
              name="emailNotificationsEnabled"
              defaultChecked={settings.emailNotificationsEnabled}
              onChange={(event) => setEnabled(event.target.checked)}
              className="mt-1 size-5 accent-[var(--color-accent)]"
            />
          </label>
          <Toggle
            name="emailDocumentUpdates"
            label="Оновлення документів"
            description="Подання, нові версії, погодження, відхилення та публікація."
            defaultChecked={settings.emailDocumentUpdates}
            disabled={!enabled}
          />
          <Toggle
            name="emailCommentUpdates"
            label="Зауваження та відповіді"
            description="Нові обговорення, відповіді та зміни їхнього статусу."
            defaultChecked={settings.emailCommentUpdates}
            disabled={!enabled}
          />
          <Toggle
            name="emailMembershipUpdates"
            label="Доступ і команда"
            description="Запрошення та зміни доступу до проєктів."
            defaultChecked={settings.emailMembershipUpdates}
            disabled={!enabled}
          />
        </div>

        {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
        {state.success ? (
          <p className="text-sm text-emerald-700">Налаштування збережено.</p>
        ) : null}

        <div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Збереження…" : "Зберегти email-налаштування"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
