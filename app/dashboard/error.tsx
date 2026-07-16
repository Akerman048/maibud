"use client";

import { RuntimeError } from "@/components/RuntimeError";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string; requestId?: string };
  reset: () => void;
}) {
  return <RuntimeError error={error} reset={reset} />;
}
