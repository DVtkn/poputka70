import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        snow: "#F4F5F1",
        taiga: "#141916",
        river: "#1E5B43",
        riverHover: "#174A36",
        riverDark: "#123A2A",
        riverLight: "#E4EFE7",
        birch: "#B26A1F",
        birchDark: "#8A4E12",
        birchLight: "#D08A3E",
        birchLightBg: "#FBF0E1",
        fog: "#E3E7E0",
        fogDark: "#D2D8D0",
        frost: "#6C7A72",
        frostDark: "#4C5A52",
        ember: "#B23A2E",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-golos)", "system-ui", "sans-serif"],
        utility: ["var(--font-jetbrains)", "monospace"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(20, 25, 22, 0.04), 0 8px 24px rgba(20, 25, 22, 0.05)",
        cardHover: "0 2px 6px rgba(20, 25, 22, 0.05), 0 16px 36px rgba(20, 25, 22, 0.09)",
        river: "0 6px 18px rgba(30, 91, 67, 0.22)",
        riverSm: "0 2px 8px rgba(30, 91, 67, 0.14)",
        birch: "0 4px 16px rgba(178, 106, 31, 0.2)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(0.85)" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        marquee: "marquee 40s linear infinite",
        pulseDot: "pulseDot 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
