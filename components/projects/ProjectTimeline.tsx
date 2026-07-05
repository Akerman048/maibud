type TimelineItem = {
  date: string;
  title: string;
  description: string;
};

const timelineItems: TimelineItem[] = [
  {
    date: "02.07.2026",
    title: "Зауваження від експерта",
    description: "Додано 3 зауваження щодо розділу газопостачання.",
  },
  {
    date: "30.06.2026",
    title: "Документи прийнято",
    description: "Комплект документів передано на експертизу.",
  },
  {
    date: "28.06.2026",
    title: "Проєкт подано",
    description: "Замовник подав проєкт на перевірку.",
  },
];

export function ProjectTimeline() {
  return (
    <div className="flex flex-col">
      {timelineItems.map((item, index) => (
        <div key={item.title} className="flex gap-4 pb-5 last:pb-0">
          <div className="flex flex-col items-center">
            <div className="size-3 rounded-full bg-[var(--color-accent)]" />

            {index !== timelineItems.length - 1 && (
              <div className="mt-2 h-full w-px bg-[var(--color-border)]" />
            )}
          </div>

          <div>
            <div className="text-xs font-semibold text-[var(--color-text-muted)]">
              {item.date}
            </div>

            <div className="mt-1 font-semibold text-[var(--color-text-primary)]">
              {item.title}
            </div>

            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {item.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}