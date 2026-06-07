"use client";

import {
  Bell,
  ChevronsUpDown,
  FolderPlus,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
  Sparkles
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AuthUser } from "@lava/shared";
import { apiClient } from "@/lib/api-client";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function AppShell({
  title,
  activeNav,
  children
}: {
  title: ReactNode;
  activeNav?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
          const next =
            typeof window === "undefined"
              ? pathname
              : `${window.location.pathname}${window.location.search}`;
          router.push(`/login?next=${encodeURIComponent(next)}`);
        }
      });
    return () => {
      mounted = false;
    };
  }, [pathname, router]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Keyboard shortcut: "C" → create new project (ignored while typing)
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) {
        return;
      }
      if (event.key === "c" || event.key === "C") {
        event.preventDefault();
        router.push("/projects/new");
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [router]);

  const handleLogout = async () => {
    try {
      await apiClient.logout();
      router.push("/login");
    } catch (error) {
      console.error("로그아웃 실패:", error);
    }
  };

  const isSettingsActive = pathname.startsWith("/settings");
  const navItems = [
    {
      label: "대시보드",
      href: "/",
      icon: LayoutDashboard,
      active: pathname === "/" && activeNav !== "settings"
    },
    {
      label: "새 프로젝트",
      href: "/projects/new",
      icon: FolderPlus,
      active: pathname.startsWith("/projects/new")
    },
    {
      label: "설정",
      href: "/settings",
      icon: Settings,
      active: isSettingsActive || activeNav === "settings"
    }
  ];

  const userName = user?.name ?? "사용자";

  return (
    <div className="min-h-screen bg-lava-app text-lava-text">
      {/* ── Sidebar (dark chrome) ───────────────────────── */}
      <aside className="lava-side fixed inset-y-0 left-0 z-50 hidden w-[248px] flex-col lg:flex">
        {/* Workspace header */}
        <div className="px-3 pt-4 pb-3">
          <Link
            href="/"
            className="group flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors duration-150 hover:bg-white/[0.04]"
          >
            <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center overflow-hidden rounded-[9px] bg-white/[0.06] ring-1 ring-white/10">
              <Image
                src="/lava_logo.png"
                alt="LAVA"
                width={22}
                height={22}
                className="h-[22px] w-[22px] object-contain"
                priority
              />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-bold leading-none tracking-tight text-white">
                LAVA
              </span>
              <span className="mt-1 block text-[10.5px] font-medium text-[color:var(--side-text-3)]">
                Workspace
              </span>
            </div>
            <ChevronsUpDown className="h-3.5 w-3.5 text-[color:var(--side-text-3)]" aria-hidden />
          </Link>
        </div>

        {/* Primary action */}
        <div className="px-3 pb-2">
          <Link
            href="/projects/new"
            className="flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-brand-primary text-[12.5px] font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition-colors duration-150 hover:bg-brand-primaryHover"
          >
            <Plus className="h-4 w-4" aria-hidden />
            새 프로젝트
            <span className="lava-kbd ml-0.5 border-white/15 bg-white/10 text-white/70">C</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--side-text-3)]">
            메뉴
          </p>
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-active={item.active}
                  className="lava-side-item flex h-[34px] items-center gap-2.5 rounded-[9px] px-2 text-[13px] font-medium"
                >
                  <Icon className="h-[16px] w-[16px] shrink-0" aria-hidden />
                  <span className="flex-1 truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* AI widget */}
          <div className="mt-5">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-brand-primary" aria-hidden />
                LAVA AI
              </div>
              <p className="mt-2 text-[11.5px] leading-[1.55] text-[color:var(--side-text-2)]">
                아이디어를 기능 명세 · API 명세 · 일정으로 한 흐름에서 정리합니다.
              </p>
            </div>
          </div>
        </nav>

        {/* Theme toggle */}
        <div className="flex items-center justify-between px-4 pb-1 pt-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--side-text-3)]">
            테마
          </span>
          <ThemeToggle tone="dark" />
        </div>

        {/* User profile */}
        <div className="border-t border-white/[0.07] p-2.5">
          <div className="flex items-center gap-2.5 rounded-[10px] px-1.5 py-1.5">
            <Avatar name={userName} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-semibold leading-tight text-white">
                {userName}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-[color:var(--side-text-3)]">
                {user?.email ?? "로그인 확인 중"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="로그아웃"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[color:var(--side-text-3)] transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <LogOut className="h-[14px] w-[14px]" aria-hidden />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Header ──────────────────────────────────────── */}
      <header className="lava-glass fixed left-0 right-0 top-0 z-40 flex h-[56px] items-center justify-between border-b border-lava-border px-4 sm:px-6 lg:left-[248px] lg:px-7">
        <div className="flex min-w-0 items-center gap-3">
          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <Image
              src="/lava_logo.png"
              alt="LAVA"
              width={26}
              height={26}
              className="h-[26px] w-[26px] object-contain"
              priority
            />
          </Link>

          <div className="min-w-0 border-l border-lava-border pl-3 lg:border-none lg:pl-0">
            {typeof title === "string" ? (
              <h1 className="truncate text-[14.5px] font-semibold tracking-tight text-lava-text">
                {title}
              </h1>
            ) : (
              title
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="알림"
            className="relative flex h-8 w-8 items-center justify-center rounded-lg text-lava-muted transition-colors hover:bg-lava-raised hover:text-lava-secondary"
          >
            <Bell className="h-[15px] w-[15px]" aria-hidden />
            <span className="absolute right-[7px] top-[7px] h-[5px] w-[5px] rounded-full bg-brand-red ring-2 ring-lava-surface" />
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1.5 rounded-lg p-1 transition-colors hover:bg-lava-raised focus:outline-none"
            >
              <Avatar name={userName} size="sm" />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 z-50 mt-2 w-60 animate-lava-enter-up rounded-xl border border-lava-border bg-lava-surface p-1.5 shadow-float">
                <div className="mb-1 flex items-center gap-2.5 border-b border-lava-border px-2.5 py-2.5">
                  <Avatar name={userName} size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-lava-text">{userName}</p>
                    <p className="truncate text-[11px] text-lava-muted">{user?.email}</p>
                  </div>
                </div>

                <Link
                  href="/settings"
                  onClick={() => setIsDropdownOpen(false)}
                  className={[
                    "flex h-9 items-center gap-2 rounded-lg px-2.5 text-[13px] font-medium transition-colors hover:bg-lava-raised",
                    isSettingsActive ? "text-brand-primary" : "text-lava-text"
                  ].join(" ")}
                >
                  <Settings className="h-4 w-4 text-lava-muted" />
                  설정
                </Link>

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    handleLogout();
                  }}
                  className="mt-0.5 flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-[13px] font-medium text-lava-text transition-colors hover:bg-[rgb(var(--c-red)/0.12)] hover:text-brand-red"
                >
                  <LogOut className="h-4 w-4 text-lava-muted" />
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Mobile bottom navigation ─────────────────── */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-lava-border bg-white/90 backdrop-blur-lg lg:hidden">
        <div className="flex h-[58px] items-center justify-around px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex h-full flex-1 flex-col items-center justify-center gap-[3px]",
                  "text-[10px] font-semibold transition-colors duration-150",
                  item.active ? "text-brand-primary" : "text-lava-muted hover:text-lava-text"
                ].join(" ")}
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Main content ────────────────────────────────── */}
      <main className="w-full px-4 pb-[74px] pt-[72px] sm:px-6 lg:pb-12 lg:pl-[280px] lg:pr-7">
        <div className="mx-auto w-full max-w-[1640px] animate-lava-enter">{children}</div>
      </main>
    </div>
  );
}
