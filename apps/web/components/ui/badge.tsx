import type { HTMLAttributes } from "react";

type BadgeTone = "success" | "warning" | "purple" | "red" | "gray" | "blue" | "teal";

const tones: Record<BadgeTone, string> = {
  success: "border-[rgb(var(--c-success)/0.25)] bg-[rgb(var(--c-success)/0.10)] text-lava-success",
  warning: "border-[rgb(var(--c-warning)/0.25)] bg-[rgb(var(--c-warning)/0.10)] text-lava-warning",
  purple:  "border-[rgb(var(--c-purple)/0.25)] bg-[rgb(var(--c-purple)/0.10)] text-lava-purple",
  red:     "border-[rgb(var(--c-red)/0.25)] bg-[rgb(var(--c-red)/0.10)] text-brand-red",
  gray:    "border-lava-border bg-lava-raised text-lava-secondary",
  blue:    "border-[rgb(var(--c-blue)/0.25)] bg-[rgb(var(--c-blue)/0.10)] text-lava-blue",
  teal:    "border-[rgb(var(--c-teal)/0.25)] bg-[rgb(var(--c-teal)/0.10)] text-lava-teal"
};

const dotColor: Record<BadgeTone, string> = {
  success: "#15935A",
  warning: "#B5710A",
  purple:  "#7B61FF",
  red:     "#D11A36",
  gray:    "#9498A1",
  blue:    "#5865F2",
  teal:    "#20A99A"
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  dot?: boolean;
};

export function Badge({ className = "", tone = "gray", dot = false, children, ...props }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px]",
        "text-[11px] font-semibold leading-none tracking-[0.01em]",
        tones[tone],
        className
      ].join(" ")}
      {...props}
    >
      {dot && (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: dotColor[tone] }}
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}
