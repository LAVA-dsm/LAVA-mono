"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

function apply(theme: Theme) {
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  document.documentElement.setAttribute("data-theme", resolved);
}

const OPTIONS: Array<{ value: Theme; icon: typeof Sun; label: string }> = [
  { value: "light", icon: Sun, label: "라이트" },
  { value: "dark", icon: Moon, label: "다크" },
  { value: "system", icon: Monitor, label: "시스템" }
];

/** Segmented light/dark/system control. `tone="dark"` for placement on the dark sidebar. */
export function ThemeToggle({ tone = "light" }: { tone?: "light" | "dark" }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = (localStorage.getItem("lava-theme") as Theme | null) ?? "system";
    setTheme(stored);
    setMounted(true);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if ((localStorage.getItem("lava-theme") as Theme | null ?? "system") === "system") {
        apply("system");
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const choose = (value: Theme) => {
    setTheme(value);
    localStorage.setItem("lava-theme", value);
    apply(value);
  };

  const isDarkTone = tone === "dark";
  const track = isDarkTone
    ? "bg-white/[0.04] border-white/[0.08]"
    : "bg-lava-raised border-lava-border";

  return (
    <div className={["inline-flex items-center gap-0.5 rounded-lg border p-0.5", track].join(" ")}>
      {OPTIONS.map(({ value, icon: Icon, label }) => {
        const active = mounted && theme === value;
        const base = "flex h-6 w-7 items-center justify-center rounded-[6px] transition-colors";
        const cls = active
          ? isDarkTone
            ? "bg-white/[0.12] text-white"
            : "bg-lava-surface text-lava-text shadow-xs"
          : isDarkTone
            ? "text-[color:var(--side-text-3)] hover:text-white"
            : "text-lava-muted hover:text-lava-text";
        return (
          <button
            key={value}
            type="button"
            onClick={() => choose(value)}
            className={[base, cls].join(" ")}
            aria-label={`${label} 테마`}
            aria-pressed={active}
            title={`${label} 테마`}
          >
            <Icon className="h-[13px] w-[13px]" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
