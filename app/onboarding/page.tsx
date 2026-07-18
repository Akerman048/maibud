import Image from "next/image";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { auth } from "@/auth";
import { GoogleOnboardingForm } from "@/components/auth/GoogleOnboardingForm";
import { Card } from "@/components/ui/Card";
import {
  INVITATION_INTENT_COOKIE,
  parseInvitationIntentPath,
} from "@/lib/invitation-intent";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const invitationIntent = parseInvitationIntentPath(
    (await cookies()).get(INVITATION_INTENT_COOKIE)?.value,
  );
  if (invitationIntent) redirect(invitationIntent);
  if (!session.user.onboardingRequired) redirect("/dashboard");

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[var(--color-background)] p-4 sm:p-5">
      <Card className="w-full min-w-0 max-w-md p-5 sm:p-8">
        <Image
          src="/maibud-logo.png"
          alt="МайБуд — Будуємо порядок."
          width={600}
          height={168}
          priority
          unoptimized
          className="h-auto max-h-12 w-full object-contain"
        />
        <h1 className="mt-7 text-2xl font-bold">Завершення реєстрації</h1>
        <p className="mb-6 mt-2 text-sm text-[var(--color-text-secondary)]">
          Вкажіть справжню назву організації, щоб підготувати робочий простір.
        </p>
        <GoogleOnboardingForm />
      </Card>
    </main>
  );
}
