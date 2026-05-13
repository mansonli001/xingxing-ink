"use client";

import { useEffect, useState } from "react";
import { ChatShell } from "@/components/ChatShell";
import { WakeUpIntro } from "@/components/WakeUpIntro";

/**
 * v0.7.9.7 · HomeClient · 客户端交互逻辑
 *
 * 从原 app/page.tsx 拆出（保留 100% 现有 client 行为）：
 *   - hydrate 检测
 *   - sessionStorage 判断是否播 WakeUpIntro
 *   - 渲染 header + ChatShell（已 hydrate）
 *
 * SSR 阶段父级 page.tsx 已经渲染了 HeroFallback（标题/slogan/Loading 标签），
 * 所以这里只需要在 hydrate 完成后接管，不需要再做 SSR-friendly fallback。
 *
 * 设计要点：hydrate 前返回 null，让 SSR HeroFallback 撑场；
 * hydrate 后接管渲染，HeroFallback 通过 CSS 自动隐藏（用 data-hydrated 属性）。
 *
 * v0.7.9.7.2：拆掉顶部微信红条 WeixinGuide（用户反馈"丑+不应该主动赶用户走"），
 * 改为输入框右上角 ShareButton（在 Chat.tsx 内挂载）。
 */
export function HomeClient() {
  // 默认 true（避免首屏闪过），mount 后读 sessionStorage 决定是否播
  const [showIntro, setShowIntro] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof sessionStorage !== "undefined") {
      const played = sessionStorage.getItem("xx_intro_played");
      if (played === "1") {
        setShowIntro(false);
      }
    }
    setHydrated(true);
    // v0.7.9.7：hydrate 完成后给 body 加标记，CSS 用来隐藏 SSR HeroFallback
    if (typeof document !== "undefined") {
      document.body.setAttribute("data-hydrated", "true");
    }
  }, []);

  // hydrate 之前返回 null —— 让父级 SSR HeroFallback 撑场不闪烁
  if (!hydrated) {
    return null;
  }

  if (showIntro) {
    return <WakeUpIntro onDone={() => setShowIntro(false)} />;
  }

  return (
    <main className="h-[100dvh] w-full bg-xx-bg flex flex-col">
      <header className="relative z-20 border-b border-xx-border px-3 sm:px-6 py-3 flex items-center justify-between gap-2 bg-xx-bg/85 backdrop-blur-md">
        <div className="flex items-baseline gap-2 sm:gap-3 min-w-0 flex-1">
          <span className="logo-serif text-2xl sm:text-[26px] leading-none shrink-0">
            醒醒
          </span>
          <span
            className="hero-slogan text-xx-rose/85 font-serif min-w-0 truncate"
            style={{ letterSpacing: "0.12em" }}
          >
            不哄人，只怼人
          </span>
          <span className="hidden md:inline text-[11px] text-xx-text-dim font-serif tracking-[0.25em] italic opacity-70 shrink-0">
            · 别做梦了
          </span>
        </div>
        <span
          className="text-[10px] sm:text-[11px] text-xx-text-dim tracking-[0.2em] sm:tracking-[0.35em] font-display font-semibold shrink-0 select-none"
          aria-label="Loading in Progress"
        >
          LOADING IN PROGRESS
        </span>
      </header>
      <div className="flex-1 overflow-hidden">
        <ChatShell />
      </div>
    </main>
  );
}
