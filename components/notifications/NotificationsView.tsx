import { FiBell } from "react-icons/fi";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

import { mockNotifications } from "@/data/mockNotifications";

export function NotificationsView() {
  return (
    <div className="grid gap-4">
      {mockNotifications.map((item) => (
        <Card key={item.id} className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[var(--color-accent)]">
              <FiBell className="size-5" />
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-semibold">{item.title}</h3>

                <Badge variant={item.type}>
                  {item.type === "warning"
                    ? "Важливо"
                    : item.type === "info"
                      ? "Інфо"
                      : "Готово"}
                </Badge>
              </div>

              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                {item.text}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}