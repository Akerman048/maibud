import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Card({
  children,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={`
        rounded-[var(--radius-lg)] border border-[var(--color-border)]
        bg-white shadow-[var(--shadow-sm)]
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}