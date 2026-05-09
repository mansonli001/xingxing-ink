import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 醒醒品牌色 v2 · 暗夜玫瑰（Midnight Rose）
        // 比纯黑温暖一度，但更危险——御姐底色
        "xx-bg": "#14101a",          // 主底（带紫调的深夜）
        "xx-bg-2": "#1f1828",        // 次级底（卡片/输入框）
        "xx-bg-3": "#2a2035",        // 第三级（hover）
        "xx-border": "#3a2e44",      // 边框（带紫调）
        "xx-border-soft": "#2a2035", // 软边框

        // 主色调
        "xx-purple": "#8b3a72",      // 提亮的玫瑰紫（比旧版更亮一档）
        "xx-purple-deep": "#5a2347", // 深玫瑰紫
        "xx-red": "#a83244",         // 暗红（提亮）
        "xx-red-deep": "#6b1e2c",    // 深暗红

        // 高光（金属粉/玫瑰金）
        "xx-rose": "#e8b4b8",        // 玫瑰金（御姐感关键色）
        "xx-rose-deep": "#c98a8e",   // 深玫瑰金
        "xx-gold": "#d4af7a",        // 暖金（保留，更温润的金）

        // 文本
        "xx-text": "#f0e8e8",        // 主文本（带粉调的米白）
        "xx-text-mid": "#b8a8b0",    // 中等文本
        "xx-text-dim": "#7a6e75",    // 次要文本
      },
      fontFamily: {
        // 标题/Logo：Noto Serif SC + Manrope（中英混排御姐感）
        serif: [
          '"Noto Serif SC"',
          '"Manrope"',
          '"Songti SC"',
          "serif",
        ],
        // 正文：Inter Tight + 系统中文
        sans: [
          '"Inter Tight"',
          '"HarmonyOS Sans SC"',
          '"PingFang SC"',
          "system-ui",
          "sans-serif",
        ],
        // 金句斜体：Cormorant Garamond Italic
        quote: [
          '"Cormorant Garamond"',
          '"Noto Serif SC"',
          "serif",
        ],
        // 数字/英文 logo
        display: [
          '"Manrope"',
          '"Inter Tight"',
          "sans-serif",
        ],
      },
      animation: {
        blink: "blink 1s step-end infinite",
        "fade-in": "fade-in 0.4s ease-out",
        "pulse-red": "pulse-red 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "silhouette-in": "silhouette-in 0.8s ease-out",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-red": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(168, 50, 68, 0.4)" },
          "50%": { boxShadow: "0 0 0 10px rgba(168, 50, 68, 0)" },
        },
        "silhouette-in": {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "0.1", transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
