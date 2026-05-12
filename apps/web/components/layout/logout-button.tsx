"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { apiClient } from "@/lib/api-client";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    await apiClient.logout().catch(() => undefined);
    router.push("/login");
  };

  return (
    <button type="button" onClick={logout} aria-label="로그아웃">
      <LogOut className="h-4 w-4 text-brand-red" aria-hidden />
    </button>
  );
}
