import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { DemoCredentials } from "@/components/auth/DemoCredentials";
import { LoginForm } from "@/components/auth/LoginForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getSafeInvitationCallbackPath } from "@/lib/invitation-validation";
import { getSafeAuthErrorMessage } from "@/lib/auth-error-message";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    invitationAccepted?: string;
    registered?: string;
    callbackUrl?: string;
    error?: string;
  }>;
}) {
  const session = await auth();
  const query = await searchParams;

  const callbackUrl = getSafeInvitationCallbackPath(query.callbackUrl);
  const authError = getSafeAuthErrorMessage(query.error);

  if (session?.user) redirect(callbackUrl);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[var(--color-background)] p-4 sm:p-5">
      <Card className="w-full min-w-0 max-w-md p-5 sm:p-8">
        <div className="mb-7">
          <div className="flex max-w-full justify-center rounded-[var(--radius-lg)] px-3 py-2">
            <Image
              src="/maibud-logo.png"
              alt="МайБуд — Будуємо порядок."
              width={600}
              height={168}
              priority
              unoptimized
              className="h-auto max-h-12 w-full object-contain"
            />
          </div>

          <h1 className="mt-7 text-2xl font-bold">Вхід у систему</h1>

          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Введіть дані свого облікового запису.
          </p>
        </div>

        <LoginForm callbackUrl={callbackUrl} />
        <GoogleSignInButton callbackUrl={callbackUrl} />

        {authError && (
          <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {authError}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-2 border-t border-[var(--color-border)] pt-4 text-center">
          <span className="text-sm text-[var(--color-text-secondary)]">
            Ще не маєте організації?
          </span>
          <Button asChild variant="secondary">
            <Link
              href={
                callbackUrl === "/dashboard"
                  ? "/register"
                  : `/register?callbackUrl=${encodeURIComponent(callbackUrl)}`
              }
            >
              Створити організацію
            </Link>
          </Button>
        </div>

        {query.registered === "1" && (
          <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
            Організацію та обліковий запис створено. Тепер увійдіть у систему.
          </p>
        )}

        {query.invitationAccepted === "1" && (
          <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
            Запрошення прийнято. Увійдіть ще раз, щоб оновити роль доступу.
          </p>
        )}

        <DemoCredentials />
      </Card>
    </main>
  );
}
