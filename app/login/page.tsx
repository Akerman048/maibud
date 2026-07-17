import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { DemoCredentials } from "@/components/auth/DemoCredentials";
import { LoginForm } from "@/components/auth/LoginForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    invitationAccepted?: string;
    registered?: string;
  }>;
}) {
  const session = await auth();
  const query = await searchParams;

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[var(--color-background)] p-4 sm:p-5">
      <Card className="w-full min-w-0 max-w-md p-5 sm:p-8">
        <div className="mb-7">
          <div className="inline-flex max-w-full rounded-[var(--radius-lg)] px-3 py-2">
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

        <LoginForm />

        <div className="mt-4 flex flex-col gap-2 border-t border-[var(--color-border)] pt-4 text-center">
          <span className="text-sm text-[var(--color-text-secondary)]">
            Ще не маєте організації?
          </span>
          <Button asChild variant="secondary">
            <Link href="/register">Створити організацію</Link>
          </Button>
        </div>

        {query.registered === "1" && (
          <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
            Організацію та обліковий запис створено. Тепер увійдіть у систему.
          </p>
        )}

        {query.invitationAccepted === "1" && (
          <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
            Запрошення прийнято. Увійдіть із новими обліковими даними.
          </p>
        )}

        <DemoCredentials />
      </Card>
    </main>
  );
}
