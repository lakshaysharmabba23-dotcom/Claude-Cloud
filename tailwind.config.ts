import type { Config } from "tailwindcss";

/**
 * Editorial "warm paper" palette. The `ink` scale keeps its original step
 * names (950 = page background ... 50 = strongest text) so every existing
 * class keeps working; only the values changed, from dark to light.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#f5f1e8",
          900: "#fbf9f4",
          800: "#eee8da",
          700: "#dcd4c2",
          600: "#c3b9a3",
          400: "#6b6457",
          200: "#3a352b",
          100: "#2a261e",
          50: "#16130e"
        },
        accent: {
          500: "#b4451f",
          400: "#923716"
        },
        good: "#1f7a4f",
        warn: "#9a6a12",
        bad: "#b3362f"
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
