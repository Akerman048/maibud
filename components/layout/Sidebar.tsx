import { SidebarNav } from "./SidebarNav";

export type DashboardRole = "head" | "expert" | "designer" | "archivist";

type SidebarProps = {
  role?: DashboardRole;
};

const userByRole = {
  head: {
    initials: "ПС",
    name: "Петренко Сергій",
    position: "Начальник експертизи",
  },
  expert: {
    initials: "КО",
    name: "Коваль Олег",
    position: "Експерт · Газопостачання",
  },
  designer: {
    initials: "РП",
    name: "Романенко Павло",
    position: "Проєктувальник · ТОВ «Проєктбуд»",
  },
  archivist: {
    initials: "ІД",
    name: "Іванов Дмитро",
    position: "Архіваріус",
  },
};

export function Sidebar({ role = "head" }: SidebarProps) {
  const user = userByRole[role];

  return (
    <aside className="flex min-h-screen w-[248px] shrink-0 flex-col bg-[var(--color-sidebar)] px-3 py-5">
      <div className="mb-4 flex items-center gap-2.5 border-b border-white/10 px-3 pb-5">
        <div className="flex size-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] text-base font-bold text-white">
          E
        </div>

        <span className="text-[17px] font-bold text-white">ExpertDesk</span>
      </div>

      <SidebarNav role={role} />

      <div className="flex items-center gap-2.5 rounded-[10px] bg-white/5 p-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold text-slate-200">
          {user.initials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-white">
            {user.name}
          </div>

          <div className="text-[12.5px] text-[var(--color-text-muted)]">
            {user.position}
          </div>
        </div>
      </div>
    </aside>
  );
}