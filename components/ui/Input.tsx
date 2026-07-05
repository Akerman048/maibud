import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      className={`
        h-10 rounded-[var(--radius-md)] border border-[var(--color-border-strong)]
        bg-white px-3.5 text-[15px] text-[var(--color-text-primary)]
        outline-none transition
        placeholder:text-[var(--color-text-muted)]
        focus:border-[var(--color-accent)]
        focus:ring-4 focus:ring-blue-500/15
        ${className}
      `}
      {...props}
    />
  );
}