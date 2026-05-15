/**
 * 诊断书展示组件 · v0.7.11.2 去 emoji 版
 *
 * 视觉主题：暗夜玫瑰（#14101a 紫黑底 + #e8b4b8 玫瑰金）
 * 内容来源：DiagnosisReport JSON
 *
 * v0.7.11.2 变更（用户反馈"emoji 太 AI 太 low"）：
 *   - ✅⚠️❌ 三档状态 → StatusChip（方案 C 彩色徽章）
 *   - PART 1/2/3 emoji → inline SVG（柱状图/扳手/罗盘）
 *   - 醒醒裁决书 📊 → gavel 法槌
 *   - KILL 盖章句 🗡️ → stamp 印章
 *   - 封面 ⏰ → 沙漏/时钟 SVG
 *   - 下次聊建议 🎯 → target 靶心
 *
 * 所有 SVG：viewBox=0 0 24 24 · stroke=currentColor · strokeWidth=1.5 · aria-hidden
 */

import type { DiagnosisReport } from "@/lib/diagnosis/types";
import { Q_NAMES } from "@/lib/diagnosis/types";
import type { ModeId } from "@/lib/prompts";
import type { ReactNode } from "react";
import { StatusChip } from "./StatusChip";

interface Props {
  data: DiagnosisReport;
}

// ============================================================
// SVG 图标库（替代 emoji）
// ============================================================

function IconBarChart({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="20" x2="20" y2="20" />
      <rect x="6" y="12" width="3" height="8" />
      <rect x="11" y="8" width="3" height="12" />
      <rect x="16" y="14" width="3" height="6" />
    </svg>
  );
}

function IconWrench({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.5-.5-2.4z" />
    </svg>
  );
}

function IconCompass({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <polygon points="14.5 9.5 9.5 11.5 11.5 14.5 16.5 12.5 14.5 9.5" fill="currentColor" fillOpacity="0.15" />
    </svg>
  );
}

function IconGavel({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="11" y="3" width="9" height="4" transform="rotate(45 15.5 5)" />
      <line x1="9" y1="9" x2="3" y2="15" />
      <line x1="4" y1="20" x2="20" y2="20" />
      <rect x="5" y="17" width="14" height="3" />
    </svg>
  );
}

function IconStamp({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 21h14" />
      <path d="M7 17h10v3H7z" />
      <path d="M9 13h6c1 0 1.5-1 1.5-2 0-1.5-1-2-1-3.5C15.5 5 14 4 12 4s-3.5 1-3.5 3.5c0 1.5-1 2-1 3.5 0 1 .5 2 1.5 2z" />
    </svg>
  );
}

function IconHourglass({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 14" />
    </svg>
  );
}

function IconTarget({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

// ============================================================
// 档位差异化色（仅用于强调元素）
// ============================================================
const modeAccent: Record<ModeId, { ring: string; chip: string; label: string }> = {
  casual: {
    ring: "ring-xx-rose/40",
    chip: "bg-xx-rose/20 text-xx-rose border-xx-rose/40",
    label: "随便聊",
  },
  rational: {
    ring: "ring-xx-text-mid/30",
    chip: "bg-xx-bg-3 text-xx-text-mid border-xx-border",
    label: "讲道理",
  },
  scathing: {
    ring: "ring-xx-red/40",
    chip: "bg-xx-red/20 text-xx-rose border-xx-red/40",
    label: "扇巴掌",
  },
};

const diagnosisColor: Record<string, string> = {
  完善: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  聚焦: "text-amber-300 bg-amber-500/10 border-amber-500/30",
  暂时存档: "text-xx-rose bg-xx-purple/20 border-xx-purple/40",
};

export function DiagnosisCard({ data }: Props) {
  const accent = modeAccent[data.mode];
  const totalQ = 12;
  const progressPct = Math.round((data.qProgress / totalQ) * 100);

  return (
    <article className="max-w-3xl mx-auto">
      {/* ========== 封面卡 ========== */}
      <header className="rounded-3xl bg-gradient-to-br from-xx-bg-2 via-xx-bg-3 to-xx-purple-deep/40 p-8 sm:p-12 border border-xx-border-soft mb-6 sm:mb-8 relative overflow-hidden">
        {/* 装饰 沙漏 SVG */}
        <div className="absolute -top-10 -right-10 w-[260px] h-[260px] sm:w-[340px] sm:h-[340px] opacity-[0.06] select-none pointer-events-none text-xx-rose">
          <IconHourglass className="w-full h-full" />
        </div>

        <div className="relative z-10 text-center sm:text-left">
          <p className="font-display text-xs tracking-[0.2em] text-xx-text-dim mb-3 inline-flex items-center gap-1.5">
            <IconHourglass className="w-3.5 h-3.5" />
            <span>醒醒诊断书 · v1.0</span>
          </p>

          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-xx-text leading-tight mb-4">
            你这事到底
            <br />
            <span className="text-xx-rose">成不成。</span>
          </h1>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-sm text-xx-text-mid font-display mb-6">
            <span>第 1 次会诊</span>
            <span className="text-xx-text-dim">·</span>
            <span>已聊 {data.generatedFromTurns} 轮</span>
            <span className="text-xx-text-dim">·</span>
            <span>
              覆盖 {data.qProgress}/{totalQ} 问
            </span>
          </div>

          {/* 当前档位标签 */}
          <div className="flex items-center justify-center sm:justify-start gap-3 mb-6">
            <span
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border ${accent.chip}`}
            >
              <span>{accent.label}档</span>
            </span>
          </div>

          {/* 进度条 */}
          <div>
            <div className="flex justify-between text-xs text-xx-text-dim mb-2 font-display tracking-wider">
              <span>本次会诊覆盖度</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-2 bg-xx-bg/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-xx-rose-deep via-xx-rose to-xx-gold transition-all duration-1000"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* ========== 三章诊断 ========== */}
      <div className="space-y-6 sm:space-y-8 mb-8">
        <PartSection part={data.parts.business} icon={<IconBarChart className="w-5 h-5 text-xx-rose" />} />
        <PartSection part={data.parts.product} icon={<IconWrench className="w-5 h-5 text-xx-gold" />} />
        <PartSection part={data.parts.founder} icon={<IconCompass className="w-5 h-5 text-xx-rose-deep" />} />
      </div>

      {/* ========== 醒醒裁决书 ========== */}
      <section className="rounded-3xl bg-gradient-to-br from-xx-purple-deep/30 to-xx-bg-2 p-8 sm:p-10 border border-xx-purple/40 mb-8">
        <div className="flex items-baseline justify-between gap-4 mb-6">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-xx-text flex items-center gap-2.5">
            <IconGavel className="w-6 h-6 sm:w-7 sm:h-7 text-xx-rose translate-y-0.5" />
            <span>醒醒裁决书</span>
          </h2>
          <span
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold border ${
              diagnosisColor[data.verdict.diagnosis]
            }`}
          >
            {data.verdict.diagnosis}
          </span>
        </div>

        <div className="text-sm sm:text-base text-xx-text leading-relaxed whitespace-pre-wrap mb-6 font-sans">
          {data.verdict.summary}
        </div>

        <div className="bg-xx-bg/40 rounded-2xl p-6 border-l-4 border-xx-rose">
          <p className="text-sm font-bold text-xx-rose mb-3 font-display tracking-wide">
            姐给你的建议是 —— 回去做这三件事：
          </p>
          <ol className="space-y-2 text-sm sm:text-base text-xx-text-mid">
            {data.verdict.homework.map((h, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-display font-bold text-xx-rose shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{h}</span>
              </li>
            ))}
          </ol>
        </div>

        <p className="mt-6 text-right text-sm text-xx-text-dim italic font-quote">
          —— 醒醒姐
        </p>
      </section>

      {/* ========== 下次聊建议 ========== */}
      <section className="rounded-3xl bg-xx-bg-2 p-8 sm:p-10 border border-xx-border-soft mb-8">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-xx-text mb-6 flex items-center gap-2.5">
          <IconTarget className="w-6 h-6 sm:w-7 sm:h-7 text-xx-gold translate-y-0.5" />
          <span>下次聊建议</span>
        </h2>

        <div className="space-y-3 text-sm sm:text-base">
          <p className="flex flex-wrap gap-2">
            <span className="font-bold text-xx-text-dim min-w-[5rem]">主攻：</span>
            <span className="text-xx-text">
              {data.nextSession.primaryQs.map((q) => (
                <span
                  key={q}
                  className="inline-flex items-baseline mr-2 px-2 py-0.5 rounded bg-xx-purple/20 text-xx-rose text-sm"
                >
                  Q{q}
                  <span className="ml-1 text-xs text-xx-text-mid">
                    {Q_NAMES[q]}
                  </span>
                </span>
              ))}
            </span>
          </p>
          <p className="flex flex-wrap gap-2">
            <span className="font-bold text-xx-text-dim min-w-[5rem]">用刀：</span>
            <span className="text-xx-text">
              {data.nextSession.blades.map((b, i) => (
                <span key={i} className="text-xx-rose mr-2">
                  {b}
                  {i < data.nextSession.blades.length - 1 && " + "}
                </span>
              ))}
            </span>
          </p>
          <p className="flex flex-wrap gap-2">
            <span className="font-bold text-xx-text-dim min-w-[5rem]">进度：</span>
            <span className="text-xx-text font-display">
              {data.qProgress}/{totalQ} → 目标 {data.nextSession.targetProgress}/{totalQ}
            </span>
          </p>
        </div>
      </section>

      {/* ========== KILL 金句卡（盖章句） ========== */}
      <section className="relative rounded-3xl bg-xx-bg p-6 sm:p-12 border-2 border-xx-rose/40 overflow-hidden text-center">
        <div className="absolute inset-0 bg-gradient-to-br from-xx-purple-deep/20 via-transparent to-xx-red/10 pointer-events-none" />

        <div className="relative z-10">
          <p className="font-display text-xs tracking-[0.3em] text-xx-text-dim mb-5 sm:mb-6 inline-flex items-center gap-1.5">
            <IconStamp className="w-3.5 h-3.5" />
            <span>醒醒盖章句</span>
          </p>

          <p className="font-quote italic text-xl sm:text-4xl text-xx-rose font-bold leading-snug sm:leading-tight mb-6 sm:mb-8 px-2">
            「{data.killQuote}」
          </p>

          <div className="flex items-center justify-center gap-2 text-[10px] sm:text-xs text-xx-text-dim font-display tracking-wider whitespace-nowrap">
            <IconHourglass className="w-3 h-3" />
            <span>xingxing.starfluxes.com</span>
          </div>
        </div>
      </section>
    </article>
  );
}

// ============================================================
// 子组件：单章诊断
// ============================================================

function PartSection({
  part,
  icon,
}: {
  part: DiagnosisReport["parts"]["business"];
  icon: ReactNode;
}) {
  const total = part.fullyCovered.length + part.halfCovered.length + part.notCovered.length;
  const covered = part.fullyCovered.length;

  return (
    <section className="rounded-3xl bg-xx-bg-2/60 backdrop-blur p-6 sm:p-8 border border-xx-border-soft">
      <div className="flex items-baseline justify-between gap-3 mb-5">
        <h3 className="font-serif text-xl sm:text-2xl font-bold text-xx-text flex items-center gap-2.5">
          <span className="translate-y-0.5">{icon}</span>
          <span>{part.title}</span>
          <span className="text-xs text-xx-text-dim font-display tracking-wider ml-1">
            ({part.range})
          </span>
        </h3>
        <span className="shrink-0 text-xs text-xx-text-dim font-display">
          {covered}/{total}
        </span>
      </div>

      {part.intro && (
        <p className="text-sm sm:text-base text-xx-text-mid italic mb-4 font-quote leading-relaxed">
          {part.intro}
        </p>
      )}

      {/* 已聊透 */}
      {part.fullyCovered.length > 0 && (
        <div className="mb-4">
          <div className="mb-2.5">
            <StatusChip status="fully" />
          </div>
          <ul className="space-y-2 text-sm">
            {part.fullyCovered.map((q) => (
              <li
                key={q.questionId}
                className="rounded-xl bg-xx-bg/40 p-3 border-l-2 border-emerald-400/50"
              >
                <p className="text-xx-text">
                  <strong className="font-mono text-emerald-300 mr-2">
                    Q{q.questionId}
                  </strong>
                  <strong>{q.questionName}</strong>：
                  <span className="italic text-xx-text-mid">「{q.userQuote}」</span>
                </p>
                <p className="text-xs text-xx-text-mid mt-1">
                  {q.evaluation}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 半聊到 */}
      {part.halfCovered.length > 0 && (
        <div className="mb-4">
          <div className="mb-2.5">
            <StatusChip status="half" />
          </div>
          <ul className="space-y-2 text-sm">
            {part.halfCovered.map((q) => (
              <li
                key={q.questionId}
                className="rounded-xl bg-xx-bg/40 p-3 border-l-2 border-amber-400/50"
              >
                <p className="text-xx-text">
                  <strong className="font-mono text-amber-300 mr-2">Q{q.questionId}</strong>
                  <strong>{q.questionName}</strong>：
                  <span className="text-xx-text-mid">
                    {q.bladesHit}/3 刀挥到
                  </span>
                </p>
                <p className="text-xs text-xx-text-mid mt-1">
                  {q.evaluation}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 没聊 */}
      {part.notCovered.length > 0 && (
        <div>
          <div className="mb-2.5">
            <StatusChip status="none" />
          </div>
          <div className="flex flex-wrap gap-2">
            {part.notCovered.map((qId) => (
              <span
                key={qId}
                className="inline-flex items-baseline px-2.5 py-1 rounded bg-xx-bg/40 text-xx-text-dim text-xs border border-xx-border-soft"
              >
                <span className="font-mono mr-1.5">Q{qId}</span>
                <span>{Q_NAMES[qId]}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
