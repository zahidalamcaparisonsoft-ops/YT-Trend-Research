import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b0e14",
        panel: "#12161f",
        line: "#232a37",
        brand: "#7c5cff",
        accent: "#22c55e",
      },
    },
  },
  plugins: [],
};
export default config;
