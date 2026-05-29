import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`lava-panel rounded-lg p-6 ${className}`}
      {...props}
    />
  );
}
