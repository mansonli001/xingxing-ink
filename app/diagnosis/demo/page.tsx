/**
 * 诊断书 Demo 页面 · /diagnosis/demo
 *
 * 用途：
 *   1. 让用户/投资人/记者无需聊天就能看到诊断书长什么样
 *   2. 三档可切换（?mode=casual|rational|scathing）
 *   3. v0.8.x 真实诊断书上线前的视觉占位
 *   4. 主站 hero 可以放「看一眼诊断书 demo」CTA → 跳到这里
 *
 * URL 示例：
 *   - /diagnosis/demo                    (默认 scathing)
 *   - /diagnosis/demo?mode=casual
 *   - /diagnosis/demo?mode=rational
 *   - /diagnosis/demo?mode=scathing
 */

import Link from "next/link";
import type { Metadata } from "next";
import { DiagnosisCard } from "@/components/diagnosis/DiagnosisCard";
import { getDemoReport } from "@/lib/diagnosis/demo";

export const metadata: Metadata = {
  title: "醒醒诊断书 · Demo · 你这事到底成不成",
  description:
    "醒醒诊断书 Demo —— 用户聊够 3 轮 · 12 问命中 ≥ 3 后会拿到的可落地诊断书样例。",
  openGraph: {
    title: "醒醒诊断书 · Demo",
    description: "你这事到底成不成 · 三档可切换的诊断书演示",
  },
};

export const dynamic = "force-static";
export const runtime = "nodejs";

interface PageProps {
  searchParams: Promise<{ mode?: string }>;
}

export default async function DiagnosisDemoPage({ searchParams }: PageProps) {
  const { mode = "scathing" } = await searchParams;
  const data = getDemoReport(mode);

  return (
    <div className="min-h-screen bg-xx-bg text-xx-text">
      {/* Header · 简版（不阻塞主产品） */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-xx-bg/85 border-b border-xx-border-soft">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xx-text hover:text-xx-rose transition-colors"
          >
            <span className="text-xl">⏰</span>
            <span className="font-serif font-bold">醒醒</span>
          </Link>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-xx-text-dim font-display tracking-wider">
              切换档位
            </span>
            <ModeSwitch current={data.mode} />
          </div>
        </div>
      </header>

      {/* Demo 标识 banner */}
      <div className="bg-xx-purple/20 border-b border-xx-purple/30 py-3 text-center text-xs text-xx-rose font-display tracking-wider">
        🎬 这是诊断书 DEMO · 想拿到属于你的，去主站聊几轮
      </div>

      {/* 诊断书主体 */}
      <main className="px-6 py-10 sm:py-16">
        <DiagnosisCard data={data} />

        {/* 底部 CTA */}
        <section className="max-w-3xl mx-auto mt-12 text-center">
          <p className="font-quote italic text-xl sm:text-2xl text-xx-text-mid mb-6">
            想拿到一份属于你自己的诊断书吗？
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-gradient-to-r from-xx-purple to-xx-red text-xx-text font-display font-semibold text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            <span>立即去聊一聊</span>
            <span>→</span>
          </Link>
          <p className="mt-6 text-xs text-xx-text-dim font-display tracking-widest">
            LOADING IN PROGRESS · CYBER LOADING
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-xx-border-soft py-8 text-center text-xs text-xx-text-dim">
        <p>
          ⏰ 醒醒诊断书 · v1.0 · 由{" "}
          <Link href="/" className="hover:text-xx-rose transition-colors">
            xingxing.starfluxes.com
          </Link>{" "}
          生成
        </p>
      </footer>
    </div>
  );
}

// ============================================================
// 子组件：档位切换（Server Component 内联用 Link 切换 query）
// ============================================================

function ModeSwitch({ current }: { current: string }) {
  const modes: Array<{ id: string; label: string; emoji: string }> = [
    { id: "casual", label: "随便聊", emoji: "🌿" },
    { id: "rational", label: "讲道理", emoji: "❄️" },
    { id: "scathing", label: "扇巴掌", emoji: "🔥" },
  ];

  return (
    <div className="flex items-center gap-1 rounded-full bg-xx-bg-2 p-1 border border-xx-border-soft">
      {modes.map((m) => (
        <Link
          key={m.id}
          href={`/diagnosis/demo?mode=${m.id}`}
          className={[
            "px-2.5 py-1 rounded-full text-xs transition-all",
            current === m.id
              ? "bg-xx-rose/20 text-xx-rose border border-xx-rose/40"
              : "text-xx-text-dim hover:text-xx-text",
          ].join(" ")}
          aria-label={`切换到${m.label}档`}
        >
          <span className="mr-1">{m.emoji}</span>
          <span className="hidden sm:inline">{m.label}</span>
        </Link>
      ))}
    </div>
  );
}
