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
        snow: "#FAFAF7",
        taiga: "#14171A",
        river: "#1C4E66",
        riverHover: "#163F54",
        riverDark: "#0F2E3D",
        riverLight: "#E8F0F4",
        birch: "#C98A3E",
        birchDark: "#8A5620",
        birchLight: "#E5A95F",
        birchLightBg: "#FBF3E4",
        fog: "#E3E6E7",
        fogDark: "#D0D5D6",
        frost: "#7C8A93",
        frostDark: "#5B6A74",
        ember: "#A6432E",
      },
      fontFamily: {
        display: ["var(--font-unbounded)", "sans-serif"],
        sans: ["var(--font-golos)", "system-ui", "sans-serif"],
        utility: ["var(--font-jetbrains)", "monospace"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      boxShadow: {
        card: "0 2px 8px rgba(20, 23, 26, 0.04), 0 8px 24px rgba(20, 23, 26, 0.06)",
        cardHover: "0 4px 12px rgba(20, 23, 26, 0.06), 0 16px 40px rgba(20, 23, 26, 0.1)",
        river: "0 4px 16px rgba(28, 78, 102, 0.30)",
        riverSm: "0 2px 8px rgba(28, 78, 102, 0.18)",
        birch: "0 4px 16px rgba(201, 138, 62, 0.28)",
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
