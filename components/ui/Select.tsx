import type { SelectHTMLAttributes } from "react";

type SelectOption = {
  label: string;
  value: string;
};

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  options: SelectOption[];
};

export function Select({
  options,
  className = "",
  ...props
}: SelectProps) {
  return (
    <select
      className={`
        h-11 w-full min-w-0 rounded-[var(--radius-md)] border border-[var(--color-border-strong)]
        bg-white px-3.5 text-base text-[var(--color-text-primary)] sm:text-[15px]
        outline-none transition
        focus:border-[var(--color-accent)]
        focus:ring-4 focus:ring-blue-500/15
        ${className}
      `}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
