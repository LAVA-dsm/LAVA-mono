"use client";

import {
  Bot,
  CalendarDays,
  FolderOpen,
  Home,
  Settings,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { AuthUser } from "@lava/shared";
import { apiClient } from "@/lib/api-client";
import { LogoutButton } from "./logout-button";

type ActiveNav = "dashboard" | "projects" | "calendar" | "settings" | "assistant";

const navItems: Array<{ id: ActiveNav; label: string; icon: typeof Home; href: string }> = [
  { id: "dashboard", label: "대시보드", icon: Home, href: "/" },
  { id: "projects", label: "내 프로젝트", icon: FolderOpen, href: "/#projects" },
  { id: "assistant", label: "AI 어시스턴트", icon: Bot, href: "/projects/new" },
  { id: "calendar", label: "캘린더", icon: CalendarDays, href: "/#calendar" },
  { id: "settings", label: "설정", icon: Settings, href: "/settings" }
];

export function AppShell({
  title,
  activeNav,
  children
}: {
  title: ReactNode;
  activeNav?: ActiveNav;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let mounted = true;

    apiClient
      .me()
      .then((response) => {
        if (mounted) setUser(response.user);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "";
        if (message.includes("로그인이 필요")) {
          const next = typeof window === "undefined" ? pathname : `${window.location.pathname}${window.location.search}`;
          router.push(`/login?next=${encodeURIComponent(next)}`);
        }
      });

    return () => {
      mounted = false;
    };
  }, [pathname, router]);

  const resolvedActiveNav = useMemo<ActiveNav>(() => {
    if (activeNav) return activeNav;
    if (pathname.startsWith("/settings")) return "settings";
    if (pathname === "/") return "dashboard";
    return "projects";
  }, [activeNav, pathname]);

  return (
    <div className="min-h-screen bg-lava-app pl-[260px]">
      <aside className="fixed left-0 top-0 flex h-screen w-[260px] flex-col border-r border-lava-border bg-white">
        <div className="flex h-[70px] items-center px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary text-white">
            <Sparkles className="h-5 w-5" aria-hidden />
          </div>
        </div>
        <nav className="mt-10 space-y-3 px-5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.id === resolvedActiveNav;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex h-12 items-center gap-3 rounded-lg px-4 text-sm font-semibold ${
                  active
                    ? "bg-brand-warmBg text-brand-primary"
                    : "text-lava-text hover:bg-lava-app"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto p-5">
          <div className="flex items-center gap-3 rounded-lg bg-lava-app p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-lava-border text-xs text-lava-muted">
              {user?.name.slice(0, 2) || "사용"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-lava-text">{user?.name || "사용자"}</p>
              <p className="truncate text-xs text-lava-secondary">{user?.email || "로그인 확인 중"}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </aside>
      <header className="fixed left-[260px] right-0 top-0 z-10 flex h-[70px] items-center border-b border-lava-border bg-white px-10">
        <div className="text-xl font-bold text-lava-text">{title}</div>
      </header>
      <main className="px-10 pb-12 pt-[102px]">{children}</main>
    </div>
  );
}
