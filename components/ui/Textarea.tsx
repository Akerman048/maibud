import type { TextareaHTMLAttributes } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className = "", ...props }: TextareaProps) {
  return (
    <textarea
      className={`
        min-h-[96px] rounded-[var(--radius-md)] border border-[var(--color-border-strong)]
        bg-white px-3.5 py-2.5 text-[15px] leading-relaxed text-[var(--color-text-primary)]
        outline-none transition resize-y
        placeholder:text-[var(--color-text-muted)]
        focus:border-[var(--color-accent)]
        focus:ring-4 focus:ring-blue-500/15
        ${className}
      `}
      {...props}
    />
  );
}