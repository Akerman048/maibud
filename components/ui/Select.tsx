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
        h-10 rounded-[var(--radius-md)] border border-[var(--color-border-strong)]
        bg-white px-3.5 text-[15px] text-[var(--color-text-primary)]
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