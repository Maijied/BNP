import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        carbon: {
          950: "#080809",
          900: "#0B0B0C",
          850: "#101012",
          800: "#161619",
          700: "#1F2024",
          600: "#2B2D33",
        },
        bnp: {
          DEFAULT: "#E11D2E",
          hover: "#EF233C",
          dark: "#B91C1C",
          glow: "rgba(225, 29, 46, 0.35)",
        },
        silver: {
          100: "#FFFFFF",
          200: "#F8FAFC",
          300: "#F1F5F9",
          400: "#E2E8F0",
          500: "#CBD5E1",
          600: "#94A3B8",
          700: "#64748B",
        },
        gold: {
          DEFAULT: "#D4AF37",
          light: "#F5D061",
          dark: "#B48B1E",
        },
      },
      fontFamily: {
        bangla: ["var(--font-hind-siliguri)", "Noto Sans Bengali", "sans-serif"],
        sans: ["var(--font-sora)", "Space Grotesk", "sans-serif"],
        display: ["var(--font-sora)", "sans-serif"],
      },
      backgroundImage: {
        "carbon-gradient": "radial-gradient(ellipse at top, #18191E 0%, #0B0B0C 70%, #060607 100%)",
        "chrome-gradient": "linear-gradient(135deg, #F8FAFC 0%, #CBD5E1 25%, #E2E8F0 50%, #94A3B8 75%, #F8FAFC 100%)",
        "red-glow": "radial-gradient(circle, rgba(225, 29, 46, 0.25) 0%, rgba(225, 29, 46, 0) 70%)",
      },
      boxShadow: {
        "plate-emboss": "inset 1px 1px 2px rgba(255, 255, 255, 0.6), inset -1px -1px 2px rgba(0, 0, 0, 0.5), 0 8px 24px -4px rgba(0, 0, 0, 0.7)",
        "plate-stamped": "1px 1px 1px rgba(255, 255, 255, 0.7), -1px -1px 1px rgba(0, 0, 0, 0.8)",
        "glass-panel": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        "bnp-glow": "0 0 20px rgba(225, 29, 46, 0.45)",
      },
      animation: {
        "shimmer": "shimmer 2.5s infinite linear",
        "pulse-subtle": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

