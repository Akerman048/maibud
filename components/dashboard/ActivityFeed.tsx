"use client";

import Link from "next/link";
import { useState } from "react";

import { Card } from "@/components/ui/Card";
import { getVisibleActivity } from "@/lib/activity-feed-visibility";
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
        <p className="break-words text-sm text-[var(--color-text-primary)]">
          <span className="font-semibold">{item.actorName ?? "Система"}</span>{" "}
          {item.action.toLocaleLowerCase("uk-UA")}
        </p>
        {item.projectName ? (
          <p className="mt-1 break-words text-xs text-[var(--color-text-secondary)]">
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
  const [isExpanded, setIsExpanded] = useState(false);
  const visibleActivity = getVisibleActivity(activity, isExpanded);
  const canToggle = activity.length > 3;

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
          <ul id="activity-feed-list">
            {visibleActivity.map((item) => (
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
        {canToggle ? (
          <div className="flex justify-center border-t border-[var(--color-border)] p-3">
            <button
              type="button"
              aria-controls="activity-feed-list"
              aria-expanded={isExpanded}
              onClick={() => setIsExpanded((value) => !value)}
              className="min-h-10 rounded-[var(--radius-md)] px-4 text-sm font-semibold text-[var(--color-accent)] transition hover:bg-[var(--color-accent-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
            >
              {isExpanded ? "Згорнути" : `Показати всі (${activity.length})`}
            </button>
          </div>
        ) : null}
      </Card>
    </section>
  );
}
