/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // 允许 API Route 长时间流式响应
    serverComponentsExternalPackages: [],
  },
  // 生产环境严格
  poweredByHeader: false,
};

module.exports = nextConfig;
