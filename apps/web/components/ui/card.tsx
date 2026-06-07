import type { HTMLAttributes } from "react";

type CardVariant = "default" | "subtle" | "elevated" | "ghost";

const variants: Record<CardVariant, string> = {
  default:  "lava-panel",
  subtle:   "lava-panel-subtle",
  elevated: "lava-panel-elevated",
  ghost:    "border border-lava-border bg-transparent"
};

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
  noPad?: boolean;
};

export function Card({ className = "", variant = "default", noPad = false, ...props }: CardProps) {
  return (
    <div
      className={[
        "rounded-xl",
        noPad ? "" : "p-6",
        variants[variant],
        className
      ].join(" ")}
      {...props}
    />
  );
}
