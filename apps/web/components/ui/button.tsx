import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  icon?: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand-primary text-white shadow-float hover:bg-brand-primaryHover disabled:bg-lava-muted",
  secondary:
    "border border-lava-borderStrong bg-white text-lava-text hover:border-brand-primary hover:text-brand-primary disabled:text-lava-muted",
  ghost: "bg-transparent text-lava-secondary hover:text-brand-primary disabled:text-lava-muted",
  danger: "bg-brand-red text-white hover:opacity-90 disabled:bg-lava-muted"
};

export function Button({ className = "", variant = "primary", icon, children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition ${variants[variant]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
