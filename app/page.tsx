/**
 * v0.7.9.7 · app/page.tsx · Server Component（顶层）
 *
 * 改造前：整个 page.tsx 是 "use client"，hydrate 前只输出
 *          <div className="fixed inset-0 bg-xx-bg" /> → SSR 首屏空白 FOUC
 *
 * 改造后：
 *   - 顶层是 Server Component（无 "use client"），SSR 阶段直接渲染 HeroFallback
 *     真实 HTML 出现在首屏，爬虫/禁 JS 都能看到产品名 + 价值主张 + 三档名
 *   - HomeClient 是 Client Component，hydrate 后接管交互（WakeUpIntro / ChatShell）
 *   - HeroFallback 在 hydrate 后通过 CSS [data-hydrated="true"] 自动隐藏，
 *     不影响交互不闪烁
 *
 * 这是 Next.js 推荐的「Streaming SSR + 客户端水合」模式。
 */
import { HeroFallback } from "./HeroFallback";
import { HomeClient } from "./HomeClient";

export default function Page() {
  return (
    <>
      {/* SSR 渲染：标题 + slogan + 三档胶囊（爬虫和禁 JS 用户能看到的内容） */}
      <HeroFallback />
      {/* Client 渲染：hydrate 后接管，渲染 WakeUpIntro 或主聊天界面 */}
      <HomeClient />
    </>
  );
}
