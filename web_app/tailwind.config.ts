import type { Config } from "tailwindcss";

const config: Config = {
  // 👇 這裡就是關鍵！我們把 src/ 拿掉了，直接找 app 和 components
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#FAF9F6", // 米白紙張底色
          dark: "#EAE8E0",    // 略深的紙張紋理
        },
        ink: {
          light: "#5C5C5C",   // 淺墨
          DEFAULT: "#333333", // 標準墨色
          dark: "#1A1A1A",    // 深墨（標題用）
        },
        accent: {
          terracotta: "#E07A5F", // 復古紅
          sage: "#81B29A",       // 莫蘭迪綠
          slate: "#708090",      // 藍灰色 (補上這一個避免報錯)
        },
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'serif'],
        sans: ['var(--font-sans)', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
export default config;