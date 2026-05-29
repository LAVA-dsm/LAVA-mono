import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  icon?: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-primary text-white shadow-[0_10px_22px_rgba(255,90,45,0.22)] hover:-translate-y-0.5 hover:bg-brand-primaryHover hover:shadow-[0_14px_30px_rgba(255,90,45,0.28)] disabled:translate-y-0 disabled:bg-lava-muted disabled:shadow-none",
  secondary:
    "border border-lava-borderStrong bg-white/90 text-lava-text shadow-sm hover:-translate-y-0.5 hover:border-brand-primary hover:bg-white hover:text-brand-primary disabled:translate-y-0 disabled:text-lava-muted",
  ghost:
    "bg-transparent text-lava-secondary hover:bg-lava-raised hover:text-brand-primary disabled:text-lava-muted",
  danger:
    "bg-brand-red text-white shadow-[0_10px_22px_rgba(230,0,45,0.18)] hover:-translate-y-0.5 hover:brightness-95 disabled:translate-y-0 disabled:bg-lava-muted disabled:shadow-none"
};

export function Button({ className = "", variant = "primary", icon, children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold tracking-normal transition-all duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-70 ${variants[variant]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
