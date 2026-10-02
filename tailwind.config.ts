import type { Config } from "tailwindcss";

/**
 * Editorial palette driven by CSS variables (see globals.css) so one set of
 * classes serves both the light "warm paper" and dark themes. The `ink` scale
 * runs 950 = page background ... 50 = strongest text in both.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "rgb(var(--ink-950) / <alpha-value>)",
          900: "rgb(var(--ink-900) / <alpha-value>)",
          800: "rgb(var(--ink-800) / <alpha-value>)",
          700: "rgb(var(--ink-700) / <alpha-value>)",
          600: "rgb(var(--ink-600) / <alpha-value>)",
          400: "rgb(var(--ink-400) / <alpha-value>)",
          200: "rgb(var(--ink-200) / <alpha-value>)",
          100: "rgb(var(--ink-100) / <alpha-value>)",
          50: "rgb(var(--ink-50) / <alpha-value>)"
        },
        accent: {
          500: "rgb(var(--accent-500) / <alpha-value>)",
          400: "rgb(var(--accent-400) / <alpha-value>)"
        },
        good: "rgb(var(--good) / <alpha-value>)",
        warn: "rgb(var(--warn) / <alpha-value>)",
        bad: "rgb(var(--bad) / <alpha-value>)"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "ui-serif", "serif"]
      }
    }
  },
  plugins: []
};

export default config;
