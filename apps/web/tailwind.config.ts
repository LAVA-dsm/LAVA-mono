import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "rgb(var(--c-brand) / <alpha-value>)",
          primaryHover: "rgb(var(--c-brand-hover) / <alpha-value>)",
          red: "rgb(var(--c-red) / <alpha-value>)",
          warmBg: "rgb(var(--c-warm) / <alpha-value>)",
          ink: "#171717"
        },
        lava: {
          app: "rgb(var(--c-app) / <alpha-value>)",
          surface: "rgb(var(--c-surface) / <alpha-value>)",
          raised: "rgb(var(--c-raised) / <alpha-value>)",
          border: "rgb(var(--c-border) / <alpha-value>)",
          borderStrong: "rgb(var(--c-border-strong) / <alpha-value>)",
          text: "rgb(var(--c-text) / <alpha-value>)",
          secondary: "rgb(var(--c-secondary) / <alpha-value>)",
          muted: "rgb(var(--c-muted) / <alpha-value>)",
          success: "rgb(var(--c-success) / <alpha-value>)",
          warning: "rgb(var(--c-warning) / <alpha-value>)",
          purple: "rgb(var(--c-purple) / <alpha-value>)",
          blue: "rgb(var(--c-blue) / <alpha-value>)",
          teal: "rgb(var(--c-teal) / <alpha-value>)"
        }
      },
      boxShadow: {
        xs: "0 1px 2px rgba(20,21,26,0.04)",
        sm: "0 1px 2px rgba(20,21,26,0.05)",
        md: "0 2px 8px rgba(20,21,26,0.06)",
        lg: "0 8px 24px rgba(20,21,26,0.08)",
        float: "0 8px 24px rgba(20,21,26,0.10), 0 2px 6px rgba(20,21,26,0.06)"
      },
      fontFamily: {
        sans: ["Pretendard Variable", "Pretendard", "system-ui", "-apple-system", "BlinkMacSystemFont", "sans-serif"]
      },
      fontSize: {
        "2xs": ["10px", { lineHeight: "14px", letterSpacing: "0.02em" }],
        xs:   ["11px", { lineHeight: "16px" }],
        sm:   ["13px", { lineHeight: "20px" }],
        base: ["14px", { lineHeight: "22px" }],
        md:   ["15px", { lineHeight: "24px" }],
        lg:   ["17px", { lineHeight: "26px" }],
        xl:   ["19px", { lineHeight: "28px" }],
        "2xl": ["22px", { lineHeight: "32px" }],
        "3xl": ["26px", { lineHeight: "36px" }],
        "4xl": ["32px", { lineHeight: "42px" }],
        "5xl": ["40px", { lineHeight: "50px" }],
        "6xl": ["48px", { lineHeight: "58px" }]
      },
      letterSpacing: {
        tighter: "-0.03em",
        tight: "-0.02em",
        snug: "-0.01em",
        normal: "0",
        brand: "0.06em",
        wide: "0.04em"
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        md: "10px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px"
      },
      keyframes: {
        "lava-enter": {
          "0%":   { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "lava-enter-up": {
          "0%":   { opacity: "0", transform: "translateY(-10px) scale(0.97)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" }
        },
        "lava-fade": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" }
        },
        "lava-scale": {
          "0%":   { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" }
        },
        "lava-slide-right": {
          "0%":   { opacity: "0", transform: "translateX(-14px)" },
          "100%": { opacity: "1", transform: "translateX(0)" }
        },
        "lava-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: ".4" }
        },
        "spin-slow": {
          "0%":   { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" }
        }
      },
      animation: {
        "lava-enter":      "lava-enter 420ms cubic-bezier(0.2,0.8,0.2,1) both",
        "lava-enter-up":   "lava-enter-up 340ms cubic-bezier(0.2,0.8,0.2,1) both",
        "lava-fade":       "lava-fade 320ms ease both",
        "lava-scale":      "lava-scale 360ms cubic-bezier(0.2,0.8,0.2,1) both",
        "lava-slide-right":"lava-slide-right 360ms cubic-bezier(0.2,0.8,0.2,1) both",
        "lava-pulse":      "lava-pulse 1.8s ease-in-out infinite",
        "spin-slow":       "spin-slow 3s linear infinite"
      },
      transitionTimingFunction: {
        "lava-out":    "cubic-bezier(0.2, 0.8, 0.2, 1)",
        "lava-spring": "cubic-bezier(0.34, 1.56, 0.64, 1)"
      }
    }
  },
  plugins: []
};

export default config;
