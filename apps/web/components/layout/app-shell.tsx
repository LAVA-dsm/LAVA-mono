"use client";

import {
  Bell,
  ChevronDown,
  FolderPlus,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AuthUser } from "@lava/shared";
import { apiClient } from "@/lib/api-client";

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
          const next = typeof window === "undefined" ? pathname : `${window.location.pathname}${window.location.search}`;
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

  return (
    <div className="min-h-screen bg-lava-app text-lava-text">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[268px] border-r border-lava-border bg-white/88 px-5 py-5 shadow-[12px_0_32px_rgba(16,24,40,0.035)] backdrop-blur-xl lg:flex lg:flex-col">
        <Link href="/" className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-lava-raised">
          <Image
            src="/lava_logo.png"
            alt="LAVA"
            width={38}
            height={38}
            className="h-[38px] w-[38px] object-contain"
            priority
          />
          <div>
            <span className="block text-lg font-black leading-tight text-brand-ink">LAVA</span>
            <span className="text-xs font-semibold text-lava-muted">Project intelligence</span>
          </div>
        </Link>

        <nav className="mt-8 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold transition-all duration-200 ${
                  item.active
                    ? "bg-brand-warmBg text-brand-primary shadow-[inset_0_0_0_1px_rgba(255,90,45,0.11)]"
                    : "text-lava-secondary hover:bg-lava-raised hover:text-lava-text"
                }`}
              >
                <Icon
                  className={`h-[18px] w-[18px] ${item.active ? "text-brand-primary" : "text-lava-muted group-hover:text-lava-text"}`}
                  aria-hidden
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 rounded-lg border border-lava-border bg-lava-raised p-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase text-brand-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            LAVA AI
          </div>
          <p className="mt-3 text-sm font-bold leading-5 text-lava-text">아이디어를 실행 가능한 문서로 바꾸는 작업대</p>
          <p className="mt-2 text-xs leading-5 text-lava-secondary">기능 명세, API 명세, 일정을 한 흐름에서 다듬습니다.</p>
        </div>

        <div className="mt-auto rounded-lg border border-lava-border bg-white p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-warmBg text-sm font-black text-brand-primary">
              {user?.name.slice(0, 2) || "LA"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-lava-text">{user?.name || "사용자"}</p>
              <p className="truncate text-xs text-lava-secondary">{user?.email || "로그인 확인 중"}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-lava-border bg-lava-raised text-xs font-bold text-lava-secondary transition hover:border-red-100 hover:bg-red-50 hover:text-brand-red"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            로그아웃
          </button>
        </div>
      </aside>

      <header className="fixed left-0 right-0 top-0 z-40 flex h-[74px] items-center justify-between border-b border-lava-border bg-white/82 px-4 backdrop-blur-xl sm:px-6 lg:left-[268px] lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="flex items-center gap-2 rounded-lg py-1 pr-2 lg:hidden">
            <Image
              src="/lava_logo.png"
              alt="LAVA"
              width={34}
              height={34}
              className="h-[34px] w-[34px] object-contain"
              priority
            />
            <span className="text-lg font-black text-brand-ink">LAVA</span>
          </Link>
          <div className="min-w-0 border-l border-lava-border pl-4 lg:border-l-0 lg:pl-0">
            {typeof title === "string" ? (
              <h1 className="truncate text-base font-black text-lava-text sm:text-lg">{title}</h1>
            ) : (
              title
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/projects/new"
            className="hidden h-10 items-center gap-2 rounded-lg bg-brand-primary px-4 text-sm font-bold text-white shadow-[0_10px_22px_rgba(255,90,45,0.22)] transition hover:-translate-y-0.5 hover:bg-brand-primaryHover sm:flex"
          >
            <FolderPlus className="h-4 w-4" aria-hidden />
            새 프로젝트
          </Link>
          <button
            type="button"
            aria-label="알림"
            className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-lava-border bg-white text-lava-secondary shadow-sm transition hover:border-brand-primary hover:text-brand-primary"
          >
            <Bell className="h-4 w-4" aria-hidden />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-red ring-2 ring-white" />
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex h-10 items-center gap-2 rounded-lg border border-lava-border bg-white px-2 text-left shadow-sm transition-all duration-200 hover:border-lava-borderStrong hover:bg-lava-raised focus:outline-none sm:gap-3"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-warmBg text-xs font-black text-brand-primary">
                {user?.name.slice(0, 2) || "LA"}
              </div>
              <div className="hidden max-w-[150px] md:block">
                <p className="truncate text-xs font-black leading-tight text-lava-text">{user?.name || "사용자"}</p>
                <p className="truncate text-[11px] leading-tight text-lava-secondary">{user?.email || "확인 중"}</p>
              </div>
              <ChevronDown className={`h-4 w-4 text-lava-secondary transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 z-50 mt-2 w-64 animate-lava-enter rounded-lg border border-lava-border bg-white p-2 shadow-float">
                <div className="mb-2 border-b border-lava-border px-3 py-3">
                  <p className="text-xs font-semibold text-lava-secondary">로그인된 계정</p>
                  <p className="mt-0.5 truncate text-sm font-black text-lava-text">{user?.name}</p>
                  <p className="truncate text-xs text-lava-secondary">{user?.email}</p>
                </div>

                <Link
                  href="/settings"
                  onClick={() => setIsDropdownOpen(false)}
                  className={`flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-bold text-lava-text transition-colors hover:bg-lava-raised ${
                    isSettingsActive ? "bg-brand-warmBg text-brand-primary" : ""
                  }`}
                >
                  <Settings className="h-4 w-4 text-lava-secondary" />
                  설정
                </Link>

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    handleLogout();
                  }}
                  className="mt-1 flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm font-bold text-lava-text transition-colors hover:bg-red-50 hover:text-brand-red"
                >
                  <LogOut className="h-4 w-4 text-lava-secondary" />
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="w-full px-4 pb-12 pt-[94px] sm:px-6 lg:pl-[300px] lg:pr-8">
        <div className="mx-auto w-full max-w-[1680px] animate-lava-enter">{children}</div>
      </main>
    </div>
  );
}
