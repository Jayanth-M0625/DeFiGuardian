import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', '"Noto Sans"', 'sans-serif'],
      },
      colors: {
        brand: "#54d22d",
        surface: "#162013",
        surfaceAlt: "#1d2d19",
        border: "#2e4328",
        borderAlt: "#426039",
        muted: "#a2c398",
        input: "#2e4328",
        inputHover: "#3d5634",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/container-queries"),
  ],
};

export default config;
