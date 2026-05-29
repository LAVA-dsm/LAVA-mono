"use client";

import {
  Settings,
  LogOut,
  ChevronDown
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef, type ReactNode } from "react";
import type { AuthUser } from "@lava/shared";
import { apiClient } from "@/lib/api-client";

export function AppShell({
  title,
  activeNav,
  children
}: {
  title: ReactNode;
  activeNav?: any;
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

  // 외부 클릭 시 드롭다운 닫기
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

  return (
    <div className="min-h-screen bg-lava-app">
      {/* 상단 고정 GNB 헤더 */}
      <header className="fixed left-0 right-0 top-0 z-50 flex h-[70px] items-center justify-between border-b border-lava-border bg-white px-10">
        {/* 좌측 로고 영역 */}
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/lava_logo.png"
              alt="LAVA"
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
              priority
            />
            <span className="text-xl font-bold tracking-tight text-brand-primary">LAVA</span>
          </Link>
        </div>

        {/* 우측 사용자 영역 */}
        <div className="flex items-center gap-6">
          {/* 현재 페이지 제목 보조 노출 */}
          <div className="hidden text-sm font-bold text-lava-secondary sm:block border-r border-lava-border pr-6">
            {title}
          </div>

          {/* 프로필 드롭다운 컨테이너 */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 rounded-lg border border-lava-border bg-white p-2 text-left transition-all duration-200 hover:bg-lava-app hover:border-lava-borderStrong focus:outline-none"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-warmBg text-xs font-bold text-brand-primary">
                {user?.name.slice(0, 2) || "사용"}
              </div>
              <div className="hidden max-w-[120px] md:block">
                <p className="truncate text-xs font-bold text-lava-text leading-tight">{user?.name || "사용자"}</p>
                <p className="truncate text-[10px] text-lava-secondary leading-tight">{user?.email || "확인 중"}</p>
              </div>
              <ChevronDown className={`h-4 w-4 text-lava-secondary transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {/* 드롭다운 카드 */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-lg border border-lava-border bg-white p-2 shadow-float animate-in fade-in slide-in-from-top-1 duration-150 z-50">
                <div className="border-b border-lava-border px-3 py-2 pb-3 mb-2">
                  <p className="text-xs text-lava-secondary">로그인된 계정</p>
                  <p className="truncate text-sm font-bold text-lava-text mt-0.5">{user?.name}</p>
                  <p className="truncate text-xs text-lava-secondary">{user?.email}</p>
                </div>

                <Link
                  href="/settings"
                  onClick={() => setIsDropdownOpen(false)}
                  className={`flex h-10 items-center gap-2.5 rounded-md px-3 text-sm font-semibold text-lava-text hover:bg-lava-app transition-colors ${
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
                  className="flex w-full h-10 items-center gap-2.5 rounded-md px-3 text-sm font-semibold text-lava-text hover:bg-lava-app hover:text-brand-red transition-colors mt-1 text-left"
                >
                  <LogOut className="h-4 w-4 text-lava-secondary hover:text-brand-red" />
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 영역 (반응형 max-width 제한 및 중앙 정렬 적용) */}
      <main className="max-w-7xl mx-auto w-full px-10 pb-12 pt-[102px]">
        {/* 대시보드 및 각종 서브 페이지들이 이 max-w-7xl 컨테이너 중앙 정렬에 쾌적하게 얹어집니다. */}
        {children}
      </main>
    </div>
  );
}
