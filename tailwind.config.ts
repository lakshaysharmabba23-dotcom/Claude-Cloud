import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0b0d12",
          900: "#12151c",
          800: "#1a1f2b",
          700: "#252b3a",
          600: "#333b4f",
          400: "#8891a8",
          200: "#d3d8e4",
          50: "#f6f7fa"
        },
        accent: {
          500: "#4f6df5",
          400: "#7690ff"
        },
        good: "#2fae74",
        warn: "#d99a2b",
        bad: "#e05a5a"
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
