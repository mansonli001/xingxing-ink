import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

/**
 * v0.7.9.7：站点正式域名（Cloudflare 代理 → Vercel）
 *
 * 优先级：
 *   1. NEXT_PUBLIC_SITE_URL 环境变量（Vercel 部署时统一注入）
 *   2. 兜底为生产域名 https://xingxing.starfluxes.com
 *
 * 用途：
 *   - metadataBase（确保 og:image 等相对路径解析为绝对 URL）
 *   - openGraph.url
 *   - alternates.canonical（防止社交平台抓到旧 vercel.app 部署链接）
 */
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://xingxing.starfluxes.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "醒醒 · 姐替你把想法熬一遍",
  description:
    "醒醒——御姐风格的 AI 对话产品。你扔过来的想法、PRD、人生选择，姐替你熬一遍，熬清楚。三档模式：随便聊 / 讲道理 / 扇巴掌。别做梦了，醒醒。",
  keywords: [
    "醒醒",
    "AI",
    "毒舌",
    "御姐",
    "PRD 审稿",
    "创业点子",
    "DeepSeek",
    "想法熬一遍",
  ],
  authors: [{ name: "Loading in Progress" }],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: "醒醒 · 姐替你把想法熬一遍",
    description:
      "御姐风格 AI，把你模糊的想法熬成清楚的判断。三档模式可选：随便聊 / 讲道理 / 扇巴掌。",
    url: SITE_URL,
    siteName: "醒醒",
    locale: "zh_CN",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "醒醒 · 姐替你把想法熬一遍",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "醒醒 · 姐替你把想法熬一遍",
    description: "御姐风格 AI · 三档模式可选：随便聊 / 讲道理 / 扇巴掌。",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#14101a",
  width: "device-width",
  initialScale: 1,
  /* 允许用户手动双指缩放（无障碍），但配合 textarea font-size:16px
     已经从根本上避免 iOS 聚焦自动放大 */
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        {/* 中文：Noto Serif SC（标题/Logo，字重900更御）+ HarmonyOS 由系统接管 */}
        {/* 英文：Manrope（标题数字）+ Inter Tight（正文）+ Cormorant Garamond Italic（金句斜体） */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;700;900&family=Manrope:wght@500;700;800&family=Inter+Tight:wght@400;500;600&family=Cormorant+Garamond:ital,wght@1,500;1,600&display=swap"
        />
        {/* 霞鹜文楷 Screen — 楷体手写感正文字体，仅用于 AI 回复正文 */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/lxgw-wenkai-screen-webfont@1.7.0/style.css"
        />
      </head>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
