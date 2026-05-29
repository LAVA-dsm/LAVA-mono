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
          warmBg: "#FFF1EC",
          ink: "#171717"
        },
        lava: {
          app: "#F6F7F9",
          surface: "#FFFFFF",
          raised: "#FBFCFD",
          border: "#E6E8EE",
          borderStrong: "#D7DBE4",
          text: "#24262B",
          secondary: "#666D78",
          muted: "#9AA1AD",
          success: "#35B85A",
          warning: "#F5A400",
          purple: "#7B61FF",
          blue: "#5865F2",
          teal: "#20A99A"
        }
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 24, 40, 0.04), 0 16px 40px rgba(16, 24, 40, 0.06)",
        float: "0 20px 50px rgba(16, 24, 40, 0.14)",
        soft: "0 10px 30px rgba(36, 38, 43, 0.08)"
      },
      fontFamily: {
        sans: ["Pretendard", "system-ui", "sans-serif"]
      },
      keyframes: {
        "lava-enter": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "lava-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: ".52" }
        }
      },
      animation: {
        "lava-enter": "lava-enter 360ms cubic-bezier(.2,.8,.2,1) both",
        "lava-pulse": "lava-pulse 1.6s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
