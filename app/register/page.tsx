import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Card } from "@/components/ui/Card";
import { getSafeInvitationCallbackPath } from "@/lib/invitation-validation";

export const metadata: Metadata = {
  title: "Створення організації",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const query = await searchParams;
  const callbackUrl = getSafeInvitationCallbackPath(query.callbackUrl);

  if (session?.user) {
    redirect(
      callbackUrl !== "/dashboard"
        ? callbackUrl
        : session.user.onboardingRequired
          ? "/onboarding"
          : "/dashboard",
    );
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[var(--color-background)] p-4 sm:p-5">
      <Card className="w-full min-w-0 max-w-2xl p-5 sm:p-8">
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

          <h1 className="mt-7 text-2xl font-bold">Створення організації</h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Створіть обліковий запис керівника та нову організацію.
          </p>
        </div>

        <RegisterForm />
        <GoogleSignInButton callbackUrl={callbackUrl} />

        <p className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
          Уже маєте обліковий запис?{" "}
          <Link
            href={
              callbackUrl === "/dashboard"
                ? "/login"
                : `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
            }
            className="font-semibold text-[var(--color-accent)] hover:underline"
          >
            Увійти
          </Link>
        </p>
      </Card>
    </main>
  );
}
