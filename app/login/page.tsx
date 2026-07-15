import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/LoginForm";
import { Card } from "@/components/ui/Card";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-background)] p-5">
      <Card className="w-full max-w-md p-7 sm:p-8">
        <div className="mb-7">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] font-bold text-white">
              E
            </div>

            <span className="text-lg font-bold">ExpertDesk</span>
          </div>

          <h1 className="mt-7 text-2xl font-bold">Вхід у систему</h1>

          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Введіть дані свого облікового запису.
          </p>
        </div>

        <LoginForm />

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