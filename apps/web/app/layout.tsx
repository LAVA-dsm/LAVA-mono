import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LAVA",
  description: "AI 기반 프로젝트 기획 및 협업 도우미"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
