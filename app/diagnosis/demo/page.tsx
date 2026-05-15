/**
 * 诊断书 Demo 页面 · /diagnosis/demo
 *
 * v0.7.9.10 重构：
 *   - 移除右上「切换档位」（违背产品逻辑：诊断书 = 某档位下的产物，已锁定）
 *   - 移除顶部 Demo banner（底部 CTA 已有「立即去聊一聊」入口）
 *   - 新增「保存长图」按钮（朋友圈/小红书分享主入口）
 *   - 档位 pill 仅展示不可切换
 *
 * URL（mode 由跳转链接传入，决定本次显示哪档 demo 数据）：
 *   - /diagnosis/demo                    (默认 scathing)
 *   - /diagnosis/demo?mode=casual        (主产品档位名)
 *   - /diagnosis/demo?mode=rational
 *   - /diagnosis/demo?mode=scathing
 */

import Link from "next/link";
import type { Metadata } from "next";
import { DiagnosisCard } from "@/components/diagnosis/DiagnosisCard";
import { DiagnosisToolbar } from "@/components/diagnosis/DiagnosisToolbar";
import { getDemoReport } from "@/lib/diagnosis/demo";

export const metadata: Metadata = {
  title: "醒醒诊断书 · Demo · 你这事到底成不成",
  description:
    "醒醒诊断书 Demo —— 用户聊够 3 轮 · 12 问命中 ≥ 3 后会拿到的可落地诊断书样例。",
  openGraph: {
    title: "醒醒诊断书 · Demo",
    description: "你这事到底成不成 · 来自醒醒的可落地诊断书",
  },
};

export const dynamic = "force-static";
export const runtime = "nodejs";

interface PageProps {
  searchParams: Promise<{ mode?: string; from?: string }>;
}

export default async function DiagnosisDemoPage({ searchParams }: PageProps) {
  const { mode = "scathing" } = await searchParams;
  const data = getDemoReport(mode);

  return (
    <div className="min-h-screen bg-xx-bg text-xx-text">
      {/* Header · 简版（不阻塞主产品） */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-xx-bg/85 border-b border-xx-border-soft">
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-xx-text hover:text-xx-rose transition-colors shrink-0"
          >
            <IconHourglass className="w-5 h-5" />
            <span className="font-serif font-bold">醒醒</span>
          </Link>

          <DiagnosisToolbar
            mode={mode}
            snapshotTargetId="diagnosis-snapshot"
          />
        </div>
      </header>

      {/* 诊断书主体（id="diagnosis-snapshot" → 截图目标） */}
      <main className="px-4 sm:px-6 py-8 sm:py-12">
        <div id="diagnosis-snapshot" className="bg-xx-bg pb-6">
          <DiagnosisCard data={data} />
        </div>

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
        <p className="inline-flex items-center justify-center gap-1.5">
          <IconHourglass className="w-3.5 h-3.5" />
          <span>醒醒诊断书 · v1.0 · 由</span>{" "}
          <Link href="/" className="hover:text-xx-rose transition-colors">
            xingxing.starfluxes.com
          </Link>{" "}
          <span>生成</span>
        </p>
      </footer>
    </div>
  );
}

// ============================================================
// SVG 图标（与 DiagnosisCard 同一套规范：24×24 / stroke=1.5 / currentColor）
// ============================================================
function IconHourglass({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 14" />
    </svg>
  );
}
