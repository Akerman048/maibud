import type { TextareaHTMLAttributes } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className = "", ...props }: TextareaProps) {
  return (
    <textarea
      className={`
        min-h-[96px] rounded-[var(--radius-md)] border border-[var(--color-border-strong)]
        w-full min-w-0 bg-white px-3.5 py-2.5 text-base leading-relaxed text-[var(--color-text-primary)] sm:text-[15px]
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
