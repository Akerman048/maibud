"use client";

import { RuntimeError } from "@/components/RuntimeError";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string; requestId?: string };
  reset: () => void;
}) {
  return (
    <html lang="uk">
      <body>
        <RuntimeError error={error} reset={reset} fullScreen />
      </body>
    </html>
  );
}
