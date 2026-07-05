import type { HTMLAttributes, ReactNode } from "react";

type BadgeVariant = "default" | "warning" | "info" | "success" | "danger";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  variant?: BadgeVariant;
};

export function Badge({
  children,
  variant = "default",
  className = "",
  ...props
}: BadgeProps) {
  const baseClasses =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold";

  const variantClasses: Record<BadgeVariant, string> = {
    default:
      "bg-slate-100 text-[var(--color-text-secondary)]",

    warning:
      "bg-orange-50 text-[var(--color-warning)]",

    info:
      "bg-blue-50 text-[var(--color-info)]",

    success:
      "bg-green-50 text-[var(--color-success)]",

    danger:
      "bg-red-50 text-[var(--color-danger)]",
  };

  return (
    <span
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}