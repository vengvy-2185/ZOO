import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: "#176B3A",
        secondary: "#2E8B57",
        forest: "#0E3F24",
        leaf: "#9BD13B",
        "light-green": "#E8F5E9",
        accent: "#F4C95D",
        background: "#F7FAF5",
        cream: "#FBF8EF",
        ink: "#17231A",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "var(--font-khmer)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-khmer)", "system-ui", "sans-serif"],
        // Battambang (Khmer glyphs only) first; Latin letters and digits inside
        // Khmer text then fall through to Inter instead of a system serif.
        khmer: ["var(--font-khmer)", "var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 30px -12px rgba(14, 63, 36, 0.18)",
        lift: "0 22px 45px -18px rgba(14, 63, 36, 0.35)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        "pulse-marker": {
          "0%,100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.25)", opacity: "0.7" },
        },
        "page-turn": {
          from: { transform: "rotateY(0deg)" },
          to: { transform: "rotateY(-180deg)" },
        },
      },
      animation: {
        "pulse-marker": "pulse-marker 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
