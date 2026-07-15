"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import type { NotificationActionState } from "@/types/notification";
import { Button } from "@/components/ui/Button";

type NotificationLinkProps = {
  notificationId: string;
  href: string | null;
  action: (
    previousState: NotificationActionState,
    formData: FormData,
  ) => Promise<NotificationActionState>;
};

function getSafeTarget(href: string | null) {
  return href?.startsWith("/") && !href.startsWith("//")
    ? href
    : null;
}

export function NotificationLink({
  notificationId,
  href,
  action,
}: NotificationLinkProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("notificationId", notificationId);
      const state = await action(
        { error: "", success: false },
        formData,
      );

      if (!state.success) return;

      const target = getSafeTarget(href);
      if (target) router.push(target);
      router.refresh();
    });
  }

  return (
    <Button type="button" variant="secondary" onClick={handleClick} disabled={isPending}>
      {isPending ? "Відкриття…" : href ? "Відкрити" : "Позначити прочитаним"}
    </Button>
  );
}
