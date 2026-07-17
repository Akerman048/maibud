import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Slot } from "@radix-ui/react-slot";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  asChild?: boolean;
};

export function Button({
  children,
  variant = "primary",
  asChild = false,
  className = "",
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";

  const baseClasses =
    "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-4 py-2.5 text-[15px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

  const variantClasses = {
    primary:
      "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]",
    secondary:
      "border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] hover:bg-slate-50",
    ghost:
      "bg-transparent text-[var(--color-text-secondary)] hover:bg-slate-100 hover:text-[var(--color-text-primary)]",
  };

  return (
    <Component
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
