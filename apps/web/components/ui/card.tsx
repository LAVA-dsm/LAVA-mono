import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-lg border border-lava-border bg-white p-6 shadow-card ${className}`}
      {...props}
    />
  );
}
