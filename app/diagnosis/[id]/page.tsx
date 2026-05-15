/**
 * 诊断书展示页 · /diagnosis/[id]
 *
 * v0.7.9.7.8 当前状态：
 *   - 路由就位但未接 KV 持久化
 *   - 任何未知 [id] 都回退到 scathing demo（友好降级）
 *   - 仅作为 v0.8.x 路由占位 + 未来路径稳定性保证
 *
 * v0.8.x 计划：
 *   - 接 KV：从 Upstash 读 `diagnosis:{id}` JSON
 *   - 接 OG：动态 OG 图（用户名 + 进度 + 金句）
 *   - 接分享：诊断书 URL 公开可访问 90 天
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { DiagnosisCard } from "@/components/diagnosis/DiagnosisCard";
import { DiagnosisToolbar } from "@/components/diagnosis/DiagnosisToolbar";
import { getDemoReport } from "@/lib/diagnosis/demo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface PageProps {
  params: Promise<{ id: string }>;
}

// ============================================================
// 数据加载（v0.7.9.7.8：仅 demo · v0.8.x：接 KV）
// ============================================================

async function loadDiagnosis(id: string) {
  // demo 路径继续走：/diagnosis/demo-scathing 等
  if (id.startsWith("demo-")) {
    const mode = id.replace("demo-", "");
    return getDemoReport(mode);
  }

  // TODO v0.8.x：接 Upstash KV
  // const data = await kv.get<DiagnosisReport>(`diagnosis:${id}`);
  // if (!data) return null;
  // return data;

  // 当前阶段：未接 KV → 任何 id 都返回 null（走 404）
  return null;
}

// ============================================================
// Metadata（动态 OG · 给分享场景）
// ============================================================

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await loadDiagnosis(id);

  if (!data) {
    return {
      title: "醒醒诊断书 · 找不到这份",
    };
  }

  return {
    title: "醒醒诊断书 · 你这事到底成不成",
    description: `${data.killQuote} · 第 ${data.generatedFromTurns} 轮会诊 · 覆盖 ${data.qProgress}/12 问`,
    openGraph: {
      title: "醒醒诊断书 · 你这事到底成不成",
      description: data.killQuote,
    },
  };
}

// ============================================================
// 页面
// ============================================================

export default async function DiagnosisPage({ params }: PageProps) {
  const { id } = await params;
  const data = await loadDiagnosis(id);

  if (!data) {
    // 404 友好态：未接 KV 时直接 notFound
    notFound();
  }

  return (
    <div className="min-h-screen bg-xx-bg text-xx-text">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-xx-bg/85 border-b border-xx-border-soft">
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-xx-text hover:text-xx-rose transition-colors shrink-0"
          >
            <span className="text-xl">⏰</span>
            <span className="font-serif font-bold">醒醒</span>
          </Link>

          <DiagnosisToolbar
            mode={data.mode}
            snapshotTargetId="diagnosis-snapshot"
          />
        </div>
      </header>

      <main className="px-4 sm:px-6 py-8 sm:py-12">
        <div id="diagnosis-snapshot" className="bg-xx-bg pb-6">
          <DiagnosisCard data={data} />
        </div>

        {/* 底部 CTA */}
        <section className="max-w-3xl mx-auto mt-12 text-center">
          <p className="font-quote italic text-lg text-xx-text-mid mb-6">
            想看看你自己的诊断书吗？
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-gradient-to-r from-xx-purple to-xx-red text-xx-text font-display font-semibold text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            <span>立即去聊一聊</span>
            <span>→</span>
          </Link>
        </section>
      </main>

      <footer className="border-t border-xx-border-soft py-8 text-center text-xs text-xx-text-dim">
        <p>
          ⏰ 醒醒诊断书 ·{" "}
          <Link href="/" className="hover:text-xx-rose transition-colors">
            xingxing.starfluxes.com
          </Link>
        </p>
      </footer>
    </div>
  );
}
