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
        // Storio Folio Palette
        folio: {
          black: "#0d0d0d",    // Background
          header: "#111111",   // Sticky Header
          card: "#121212",     // Entry Card
          "card-hover": "#1a1a1a", 
          outline: "#2a2a2a",
        },
        text: {
          primary: "#ffffff",
          secondary: "#e0e0e0",
          desc: "#888888",
        },
        accent: {
          gold: "#c5a059",     // Primary Highlight (Memory/Collection)
          brown: "#8b5a2b",    // Secondary Accents
          "red-brown": "#7b2c1d", // Movie Identification
          tan: "#b69b7d",      // Book Identification
          error: "#cf6679",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "var(--font-noto-tc)", "system-ui", "sans-serif"],
        roboto: ["var(--font-roboto)", "sans-serif"],
        heading: ["Libre Franklin", "NeuaHaasUnica", "sans-serif"],
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
        DEFAULT: "8px", // Standard
        lg: "12px",     // Huge
        xl: "16px",     // Super Huge
      },
      spacing: {
        indent: "24px",
        header: "68px",
        "container-max": "1200px",
      },
    },
  },
  plugins: [],
};
export default config;