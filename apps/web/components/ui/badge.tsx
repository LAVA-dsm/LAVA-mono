import type { HTMLAttributes } from "react";

type BadgeTone = "success" | "warning" | "purple" | "red" | "gray";

const tones: Record<BadgeTone, string> = {
  success: "border-green-100 bg-green-50 text-lava-success",
  warning: "border-orange-100 bg-orange-50 text-lava-warning",
  purple: "border-violet-100 bg-violet-50 text-lava-purple",
  red: "border-red-100 bg-red-50 text-brand-red",
  gray: "border-lava-border bg-lava-raised text-lava-secondary"
};

export function Badge({ className = "", tone = "gray", ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold leading-none ${tones[tone]} ${className}`}
      {...props}
    />
  );
}
