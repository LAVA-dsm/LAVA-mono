import {
  Bot,
  CalendarDays,
  FolderOpen,
  Home,
  LogOut,
  Settings,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const navItems = [
  { label: "대시보드", icon: Home, href: "#" },
  { label: "내 프로젝트", icon: FolderOpen, href: "/projects/new", active: true },
  { label: "AI 어시스턴트", icon: Bot, href: "#" },
  { label: "캘린더", icon: CalendarDays, href: "#" },
  { label: "설정", icon: Settings, href: "#" }
];

export function AppShell({ title, children }: { title: ReactNode; children: ReactNode }) {
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
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex h-12 items-center gap-3 rounded-lg px-4 text-sm font-semibold ${
                  item.active
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
              Dev
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-lava-text">개발용 리더</p>
              <p className="truncate text-xs text-lava-secondary">dev-leader@lava.local</p>
            </div>
            <LogOut className="h-4 w-4 text-brand-red" aria-hidden />
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
