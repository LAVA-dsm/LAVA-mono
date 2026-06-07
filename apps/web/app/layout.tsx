import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "LAVA", template: "%s · LAVA" },
  description: "아이디어를 실행 가능한 프로젝트 문서로. AI 기반 프로젝트 기획 및 협업 플랫폼."
};

const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('lava-theme');
    var theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
