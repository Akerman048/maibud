"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  registrationSchema,
  type RegistrationFieldErrors,
} from "@/lib/registration-validation";

type RegistrationResponse = {
  error?: string;
  fieldErrors?: RegistrationFieldErrors;
};

function FieldError({
  id,
  errors,
}: {
  id: string;
  errors?: string[];
}) {
  if (!errors?.length) {
    return null;
  }

  return (
    <p id={id} className="text-sm font-medium text-red-700">
      {errors[0]}
    </p>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] =
    useState<RegistrationFieldErrors>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldErrors({});

    const form = event.currentTarget;
    const formData = new FormData(form);
    const input = {
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? ""),
      organizationName: String(formData.get("organizationName") ?? ""),
      termsAccepted: formData.get("termsAccepted") === "on",
    };
    const parsed = registrationSchema.safeParse(input);

    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = (await response.json()) as RegistrationResponse;

      if (!response.ok) {
        setError(result.error ?? "Не вдалося створити організацію.");
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      router.push("/login?registered=1");
      router.refresh();
    } catch {
      setError("Не вдалося створити організацію. Спробуйте ще раз.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <label htmlFor="firstName" className="text-sm font-semibold">
          Ім’я
        </label>
        <Input
          id="firstName"
          name="firstName"
          autoComplete="given-name"
          required
          maxLength={100}
          disabled={isPending}
          aria-invalid={Boolean(fieldErrors.firstName?.length)}
          aria-describedby={fieldErrors.firstName ? "firstName-error" : undefined}
        />
        <FieldError id="firstName-error" errors={fieldErrors.firstName} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="lastName" className="text-sm font-semibold">
          Прізвище
        </label>
        <Input
          id="lastName"
          name="lastName"
          autoComplete="family-name"
          required
          maxLength={100}
          disabled={isPending}
          aria-invalid={Boolean(fieldErrors.lastName?.length)}
          aria-describedby={fieldErrors.lastName ? "lastName-error" : undefined}
        />
        <FieldError id="lastName-error" errors={fieldErrors.lastName} />
      </div>

      <div className="flex flex-col gap-2 sm:col-span-2">
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
          aria-invalid={Boolean(fieldErrors.email?.length)}
          aria-describedby={fieldErrors.email ? "register-email-error" : undefined}
        />
        <FieldError id="register-email-error" errors={fieldErrors.email} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="register-password" className="text-sm font-semibold">
          Пароль
        </label>
        <Input
          id="register-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
          disabled={isPending}
          aria-invalid={Boolean(fieldErrors.password?.length)}
          aria-describedby={fieldErrors.password ? "register-password-error" : "password-help"}
        />
        <p id="password-help" className="text-xs text-[var(--color-text-muted)]">
          Мінімум 8 символів, велика й мала літери та цифра.
        </p>
        <FieldError id="register-password-error" errors={fieldErrors.password} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="confirmPassword" className="text-sm font-semibold">
          Підтвердження пароля
        </label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
          disabled={isPending}
          aria-invalid={Boolean(fieldErrors.confirmPassword?.length)}
          aria-describedby={fieldErrors.confirmPassword ? "confirmPassword-error" : undefined}
        />
        <FieldError id="confirmPassword-error" errors={fieldErrors.confirmPassword} />
      </div>

      <div className="flex flex-col gap-2 sm:col-span-2">
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
          aria-invalid={Boolean(fieldErrors.organizationName?.length)}
          aria-describedby={fieldErrors.organizationName ? "organizationName-error" : undefined}
        />
        <FieldError id="organizationName-error" errors={fieldErrors.organizationName} />
      </div>

      <div className="flex flex-col gap-2 sm:col-span-2">
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            name="termsAccepted"
            type="checkbox"
            required
            disabled={isPending}
            className="mt-0.5 size-5 shrink-0 rounded border-[var(--color-border-strong)] accent-[var(--color-accent)]"
            aria-invalid={Boolean(fieldErrors.termsAccepted?.length)}
            aria-describedby={fieldErrors.termsAccepted ? "termsAccepted-error" : undefined}
          />
          <span>Я погоджуюся з умовами використання.</span>
        </label>
        <FieldError id="termsAccepted-error" errors={fieldErrors.termsAccepted} />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700 sm:col-span-2"
        >
          {error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="sm:col-span-2">
        {isPending ? "Створення..." : "Створити організацію"}
      </Button>
    </form>
  );
}
