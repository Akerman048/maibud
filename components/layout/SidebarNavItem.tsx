"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconType } from "react-icons";

type SidebarNavItemProps = {
  label: string;
  href: string;
  icon: IconType;
  badge?: number;
};

export function SidebarNavItem({
  label,
  href,
  icon: Icon,
  badge,
}: SidebarNavItemProps) {
  const pathname = usePathname();

  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`
        flex items-center gap-3 rounded-[var(--radius-md)]
        px-3 py-2.5 text-[15px] transition
        ${
          isActive
            ? "bg-blue-500/20 font-semibold !text-white"
            : "font-medium !text-[#94A3B8] hover:bg-white/5 hover:!text-[#E2E8F0]"
        }
      `}
    >
      <Icon className="size-[18px] shrink-0" />

      <span className="flex-1">{label}</span>

      {badge !== undefined && (
        <span className="rounded-full bg-[var(--color-warning)] px-2 py-0.5 text-xs font-bold !text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}