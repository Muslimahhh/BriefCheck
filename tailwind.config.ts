import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1f2933",
        paper: "#f7f8f5",
        line: "#d8ddd4",
        moss: "#4d6957",
        clay: "#9f5d48",
        steel: "#506274",
        maize: "#b78d35"
      },
      boxShadow: {
        panel: "0 1px 2px rgba(31, 41, 51, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
