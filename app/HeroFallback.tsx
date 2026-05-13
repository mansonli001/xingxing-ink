/**
 * v0.7.9.7 · HeroFallback · SSR 极简首屏壳
 *
 * 这是一个 Server Component（不带 "use client"），所以会在服务器端渲染成
 * 真实 HTML 输出到首屏。
 *
 * 目的：
 *   1. 修复"首屏只有底色"的 FOUC 问题（深度审查 P0）
 *   2. 让爬虫 / 链接预览 / 禁用 JS 用户能看到产品名 + 价值主张
 *   3. 提供 hydrate 之前的视觉占位，避免空白闪烁
 *
 * 渲染顺序：
 *   - SSR 阶段：HeroFallback 输出真实 HTML，HomeClient 返回 null
 *   - Hydrate 后：HomeClient 拿到 hydrated=true，渲染真实 main + ChatShell
 *     此时 HeroFallback 通过 [data-hydrated="true"] 选择器在 globals.css 中
 *     被设为 display:none（不闪不卡）
 *
 * 视觉设计（最小集合）：
 *   - 黑紫底色（继承 globals.css :root --xx-bg）
 *   - 居中标题 "醒醒" + 副标题 "姐替你把想法熬一遍"
 *   - 三档名称胶囊（提示用户即将看到的功能）
 *   - 右下角 "LOADING IN PROGRESS" 品牌签名（保留梗）
 *
 * 注意：HeroFallback 不需要任何交互，纯静态 HTML，css 自带的字体/颜色变量
 * 在 layout.tsx 已加载，无需重复声明。
 */
export function HeroFallback() {
  return (
    <div
      className="hero-fallback fixed inset-0 z-30 flex flex-col items-center justify-center bg-xx-bg pointer-events-none"
      aria-hidden="false"
      data-ssr-hero="true"
    >
      {/* 主要内容居中 */}
      <div className="flex flex-col items-center gap-3 px-6 max-w-2xl text-center">
        {/* 标题 醒醒 */}
        <h1
          className="logo-serif text-5xl sm:text-6xl md:text-7xl leading-none mb-2"
          style={{ color: "#d4af7a" }}
        >
          醒醒
        </h1>
        {/* 副标题 slogan（v0.7.9.7.1 钩子升级：不哄人，只怼人） */}
        <p
          className="font-serif text-base sm:text-lg md:text-xl"
          style={{ color: "#e8b4b8", opacity: 0.9, letterSpacing: "0.18em" }}
        >
          不哄人，只怼人
        </p>
        {/* 三档胶囊 */}
        <div className="flex gap-2 sm:gap-3 mt-4 flex-wrap justify-center">
          <span
            className="hero-pill"
            style={{
              borderColor: "#d170e8",
              color: "#d170e8",
              boxShadow: "0 0 16px -4px rgba(209, 112, 232, 0.4)",
            }}
          >
            随便聊
          </span>
          <span
            className="hero-pill"
            style={{
              borderColor: "#d4af7a",
              color: "#d4af7a",
              boxShadow: "0 0 16px -4px rgba(212, 175, 122, 0.4)",
            }}
          >
            讲道理
          </span>
          <span
            className="hero-pill"
            style={{
              borderColor: "#991b1b",
              color: "#cc6677",
              boxShadow: "0 0 16px -4px rgba(153, 27, 27, 0.45)",
            }}
          >
            扇巴掌
          </span>
        </div>
        {/* 副副标题 */}
        <p
          className="text-xs sm:text-sm font-serif italic mt-4 opacity-60"
          style={{ color: "#A9A8C0" }}
        >
          · 别做梦了 ·
        </p>
        {/* 加载提示（hydrate 之前看到这条） */}
        <p
          className="text-[10px] sm:text-[11px] mt-6 tracking-[0.3em] uppercase opacity-50"
          style={{ color: "#A9A8C0" }}
        >
          loading in progress……
        </p>
      </div>
    </div>
  );
}
