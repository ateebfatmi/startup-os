import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./features/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17211b",
        paper: "#f4f1e8",
        lime: "#c8f560",
        mint: "#76d6b2",
        orange: "#ff8a4c",
      },
      boxShadow: {
        panel: "0 18px 60px rgba(16, 31, 23, .12)",
      },
    },
  },
  plugins: [],
};

export default config;
