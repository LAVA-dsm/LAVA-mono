import type { HTMLAttributes } from "react";

type BadgeTone = "success" | "warning" | "purple" | "red" | "gray";

const tones: Record<BadgeTone, string> = {
  success: "bg-green-50 text-lava-success",
  warning: "bg-orange-50 text-lava-warning",
  purple: "bg-violet-50 text-lava-purple",
  red: "bg-red-50 text-brand-red",
  gray: "bg-gray-100 text-lava-secondary"
};

export function Badge({ className = "", tone = "gray", ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]} ${className}`}
      {...props}
    />
  );
}
