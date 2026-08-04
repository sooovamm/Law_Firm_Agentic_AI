import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
          DEFAULT: "#1e40af",
          dark: "#1e3a8a",
          light: "#3b82f6",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
        elevated: "0 4px 12px -2px rgb(15 23 42 / 0.08), 0 2px 4px -2px rgb(15 23 42 / 0.06)",
        floating: "0 12px 32px -8px rgb(15 23 42 / 0.16), 0 4px 8px -4px rgb(15 23 42 / 0.08)",
        glow: "0 0 0 1px rgb(79 70 229 / 0.08), 0 8px 24px -4px rgb(79 70 229 / 0.18)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "bounce-dot": {
          "0%, 80%, 100%": { transform: "scale(0.6)", opacity: "0.4" },
          "40%": { transform: "scale(1)", opacity: "1" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        shimmer: "shimmer 2s ease-in-out infinite",
        "bounce-dot": "bounce-dot 1.4s ease-in-out infinite",
        "slide-in-right": "slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      },
      backgroundImage: {
        "gradient-mesh":
          "radial-gradient(at 20% 0%, rgb(99 102 241 / 0.12) 0px, transparent 50%), radial-gradient(at 80% 0%, rgb(59 130 246 / 0.10) 0px, transparent 50%)",
      },
    },
  },
  plugins: [typography],
};
export default config;
