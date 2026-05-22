import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        aqua: {
          50: "#e8fffd",
          100: "#c9fff8",
          300: "#62f2e4",
          500: "#19c8bf",
          700: "#0d817f"
        },
        boutique: {
          pink: "#ff69a8",
          blush: "#fff0f7",
          charcoal: "#3d3d46",
          mint: "#dcfff9",
          gold: "#ffd166"
        }
      },
      boxShadow: {
        soft: "0 16px 35px rgba(25, 200, 191, 0.16)",
        pink: "0 14px 30px rgba(255, 105, 168, 0.18)"
      },
      borderRadius: {
        boutique: "1.25rem"
      }
    }
  },
  plugins: []
};

export default config;
