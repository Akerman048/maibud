import { redirect } from "next/navigation";

import { auth } from "@/auth";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
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
