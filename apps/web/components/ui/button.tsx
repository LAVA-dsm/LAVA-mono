import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: [
    "bg-brand-primary text-white shadow-xs",
    "hover:bg-brand-primaryHover",
    "active:bg-brand-primaryHover",
    "disabled:bg-lava-muted disabled:shadow-none"
  ].join(" "),

  secondary: [
    "border border-lava-borderStrong bg-lava-surface text-lava-text shadow-xs",
    "hover:bg-lava-raised hover:border-lava-secondary/40",
    "disabled:text-lava-muted disabled:border-lava-border"
  ].join(" "),

  ghost: [
    "text-lava-secondary bg-transparent",
    "hover:bg-lava-raised hover:text-lava-text",
    "disabled:text-lava-muted"
  ].join(" "),

  danger: [
    "bg-brand-red text-white shadow-xs",
    "hover:brightness-95",
    "disabled:bg-lava-muted disabled:shadow-none"
  ].join(" ")
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 rounded-[8px] px-3.5 text-xs font-semibold",
  md: "h-10 gap-2 rounded-[10px] px-4 text-sm font-semibold",
  lg: "h-11 gap-2 rounded-[10px] px-5 text-sm font-semibold"
};

export function Button({
  className = "",
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  loading,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        "inline-flex items-center justify-center",
        "transition-all duration-150 ease-out",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2",
        sizeClasses[size],
        variantClasses[variant],
        className
      ].join(" ")}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg
          className="h-3.5 w-3.5 animate-spin"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
        >
          <circle
            cx="8" cy="8" r="6"
            stroke="currentColor"
            strokeWidth="2"
            strokeOpacity="0.25"
          />
          <path
            d="M8 2a6 6 0 0 1 6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
      {iconRight && !loading ? (
        <span className="shrink-0">{iconRight}</span>
      ) : null}
    </button>
  );
}
