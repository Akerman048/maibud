import Image from "next/image";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/LoginForm";
import { Card } from "@/components/ui/Card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ invitationAccepted?: string }>;
}) {
  const session = await auth();
  const query = await searchParams;

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-background)] p-5">
      <Card className="w-full max-w-md p-7 sm:p-8">
        <div className="mb-7">
          <div className="inline-flex rounded-[var(--radius-lg)] bg-[var(--color-sidebar)] px-3 py-2">
            <Image
              src="/maibud-logo.png"
              alt="МайБуд — Будуємо порядок."
              width={600}
              height={168}
              priority
              unoptimized
              className="h-12 w-auto"
            />
          </div>

          <h1 className="mt-7 text-2xl font-bold">Вхід у систему</h1>

          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Введіть дані свого облікового запису.
          </p>
        </div>

        <LoginForm />

        {query.invitationAccepted === "1" && (
          <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
            Запрошення прийнято. Увійдіть із новими обліковими даними.
          </p>
        )}

        <div className="mt-6 rounded-md bg-slate-50 p-4 text-sm text-[var(--color-text-secondary)]">
          <div className="font-semibold text-slate-700">
            Demo-користувачі
          </div>

          <div className="mt-2">
            Пароль для всіх:{" "}
            <code className="font-semibold">Demo1234!</code>
          </div>
        </div>
      </Card>
    </main>
  );
}
