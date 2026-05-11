import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#FF5A2D",
          primaryHover: "#F04A23",
          red: "#E6002D",
          warmBg: "#FFF1EC"
        },
        lava: {
          app: "#F5F6F8",
          surface: "#FFFFFF",
          border: "#E5E7EB",
          borderStrong: "#D8DCE2",
          text: "#2F2F33",
          secondary: "#6F737A",
          muted: "#A0A4AB",
          success: "#35B85A",
          warning: "#F5A400",
          purple: "#7B61FF",
          blue: "#5865F2"
        }
      },
      boxShadow: {
        card: "0 8px 24px rgba(16, 24, 40, 0.06)",
        float: "0 12px 32px rgba(16, 24, 40, 0.10)"
      },
      fontFamily: {
        sans: ["Pretendard", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
