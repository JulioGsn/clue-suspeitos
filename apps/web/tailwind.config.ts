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
        noir: {
          green: "#1a3b2b",
          wood: "#2c1e16",
          paper: "#f4eedc",
          orange: "#f97316",
          gold: "#eab308",
          red: "#991b1b",
        },
        light: {
          bg: "#fdfbf7",
          wood: "#d4b483",
          panel: "#ffffff",
          navy: "#1e3a8a",
        },
      },
    },
  },
  plugins: [],
  darkMode: "class",
};
export default config;
