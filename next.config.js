/** @type {import('next').NextConfig} */

// v0.7.9.7.8 安全 P0：基础响应头
//
// CSP 白名单依据：lib/security/CSP-SOURCES.md（详见子 agent 扫描结果）
// - DeepSeek / 火山 TTS / ElevenLabs：服务端调用，浏览器不直连，CSP 不放行
// - Vercel Analytics：生产走同源 /_vercel/insights，dev fallback 加 va.vercel-scripts.com
// - Google Fonts + jsDelivr 霞鹜文楷：app/layout.tsx 直接 <link> 引入
// - QR 二维码：components/ShareQRDialog.tsx 用 api.qrserver.com
// - 字体 / 媒体 / 图片：blob: 给 TTS audio 用，data: 给 inline SVG 兜底
const ContentSecurityPolicy = [
  "default-src 'self'",
  // Next.js 14 hydration 内联 script 必须 'unsafe-inline'（无 dangerouslySetInnerHTML 命中，但 SSR 注入难免）
  "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
  // Tailwind / inline style / Next.js critical CSS 必须 'unsafe-inline'
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
  "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
  "img-src 'self' data: blob: https://api.qrserver.com",
  "media-src 'self' blob:",
  "connect-src 'self' https://va.vercel-scripts.com https://vitals.vercel-insights.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: ContentSecurityPolicy,
  },
  {
    // 双保险：frame-ancestors 已经在 CSP 里，但老浏览器只认 X-Frame-Options
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    // 防 MIME sniffing
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // 跳出站点不带完整 referer（隐私 + 防内部路径泄漏）
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // 禁用项目用不到的浏览器能力（防被注入脚本偷偷调用）
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // 允许 API Route 长时间流式响应
    serverComponentsExternalPackages: [],
  },
  // 生产环境严格
  poweredByHeader: false,

  async headers() {
    return [
      {
        // 全站统一注入安全响应头
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
