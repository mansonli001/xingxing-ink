/**
 * 诊断书展示页 · /diagnosis/[id]
 *
 * v0.7.11：接 KV 读真实数据
 *   - id 以 demo- 开头 → 走 demo 数据（保留演示路径）
 *   - id 以 d_ 开头 → 从 Upstash KV 读 JSON
 *   - 读不到 → notFound 走 404
 *
 * KV schema：
 *   key: diagnosis:{id}
 *   value: JSON.stringify(DiagnosisReport)
 *   TTL:  90 天
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { DiagnosisCard } from "@/components/diagnosis/DiagnosisCard";
import { DiagnosisToolbar } from "@/components/diagnosis/DiagnosisToolbar";
import { getDemoReport } from "@/lib/diagnosis/demo";
import type { DiagnosisReport } from "@/lib/diagnosis/types";
import { getClient as getKvClient } from "@/lib/stats/kv";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface PageProps {
  params: Promise<{ id: string }>;
}

// ============================================================
// 数据加载（demo 路径继续保留 + 接 KV）
// ============================================================

async function loadDiagnosis(id: string): Promise<DiagnosisReport | null> {
  // demo 路径：/diagnosis/demo-scathing 等（保留演示路径不破坏）
  if (id.startsWith("demo-")) {
    const mode = id.replace("demo-", "");
    return getDemoReport(mode);
  }

  // 真实诊断书：从 KV 读
  if (!id.startsWith("d_")) {
    return null;
  }

  try {
    const kv = await getKvClient();
    const raw = await kv.get<string>(`diagnosis:${id}`);
    if (!raw) return null;

    // Upstash 返回可能是 string（已序列化）或已自动反序列化为对象
    if (typeof raw === "string") {
      return JSON.parse(raw) as DiagnosisReport;
    }
    return raw as unknown as DiagnosisReport;
  } catch (err) {
    console.error(`[/diagnosis/${id}] KV 读取失败：`, err);
    return null;
  }
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
            <IconHourglass className="w-5 h-5" />
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

        {/* 底部 CTA · 真实诊断书：回去继续聊 */}
        <section className="max-w-3xl mx-auto mt-12 text-center">
          <p className="font-quote italic text-lg text-xx-text-mid mb-6">
            带着这份诊断回去，继续被怼。
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-gradient-to-r from-xx-purple to-xx-red text-xx-text font-display font-semibold text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            <span>回去继续聊</span>
            <span>→</span>
          </Link>
        </section>
      </main>

      <footer className="border-t border-xx-border-soft py-8 text-center text-xs text-xx-text-dim">
        <p className="inline-flex items-center justify-center gap-1.5">
          <IconHourglass className="w-3.5 h-3.5" />
          <span>醒醒诊断书 ·</span>{" "}
          <Link href="/" className="hover:text-xx-rose transition-colors">
            xingxing.starfluxes.com
          </Link>
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
