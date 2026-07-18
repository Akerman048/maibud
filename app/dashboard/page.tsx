import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { auth } from "@/auth";
import {
  INVITATION_INTENT_COOKIE,
  parseInvitationIntentPath,
} from "@/lib/invitation-intent";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const invitationIntent = parseInvitationIntentPath(
    (await cookies()).get(INVITATION_INTENT_COOKIE)?.value,
  );
  if (invitationIntent) {
    redirect(invitationIntent);
  }

  if (session.user.onboardingRequired) {
    redirect("/onboarding");
  }

  if (session.user.role === "HEAD") {
    redirect("/dashboard/head");
  }

  if (session.user.role === "EXPERT") {
    redirect("/dashboard/expert");
  }

  if (session.user.role === "DESIGNER") {
    redirect("/dashboard/designer");
  }

  if (session.user.role === "ARCHIVIST") {
    redirect("/dashboard/archivist");
  }

  if (session.user.role === "CLIENT") {
    redirect("/dashboard/client");
  }

  redirect("/project/inactive");
}
