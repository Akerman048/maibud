import Link from "next/link";

import { Card } from "@/components/ui/Card";
import type { ActivityFeedItem } from "@/types/dashboard";

const formatter = new Intl.DateTimeFormat("uk-UA", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Kyiv",
});

function ActivityContent({ item }: { item: ActivityFeedItem }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="text-sm text-[var(--color-text-primary)]">
          <span className="font-semibold">{item.actorName ?? "Система"}</span>{" "}
          {item.action.toLocaleLowerCase("uk-UA")}
        </p>
        {item.projectName ? (
          <p className="mt-1 truncate text-xs text-[var(--color-text-secondary)]">
            Проєкт: {item.projectName}
          </p>
        ) : null}
      </div>
      <time
        className="shrink-0 text-xs text-[var(--color-text-muted)]"
        dateTime={item.createdAt}
      >
        {formatter.format(new Date(item.createdAt))}
      </time>
    </div>
  );
}

export function ActivityFeed({ activity }: { activity: ActivityFeedItem[] }) {
  return (
    <section aria-labelledby="activity-feed-title">
      <h2 id="activity-feed-title" className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
        Остання активність
      </h2>
      <Card className="divide-y divide-[var(--color-border)] overflow-hidden">
        {activity.length === 0 ? (
          <p className="p-5 text-sm text-[var(--color-text-secondary)]">
            За обраний період активності немає.
          </p>
        ) : (
          <ul>
            {activity.map((item) => (
              <li key={item.id} className="border-b border-[var(--color-border)] last:border-b-0">
                {item.href ? (
                  <Link
                    href={item.href}
                    className="block p-4 transition hover:bg-[var(--color-background)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-accent)]"
                    aria-label={`${item.actorName ?? "Система"}: ${item.action}`}
                  >
                    <ActivityContent item={item} />
                  </Link>
                ) : (
                  <div className="p-4"><ActivityContent item={item} /></div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
