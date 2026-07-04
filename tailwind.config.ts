import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#F4F5F7", // page background (light)
        panel: "#FFFFFF", // cards
        line: "#E8E9EE", // borders
        brand: "#17181C", // primary dark (buttons, sidebar)
        accent: "#16A34A", // success green
        sun: "#FACC15", // signature yellow
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,.05), 0 1px 3px rgba(16,24,40,.06)",
        pop: "0 10px 30px rgba(16,24,40,.14)",
      },
    },
  },
  plugins: [],
};
export default config;
