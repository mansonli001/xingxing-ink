"use client";

/**
 * 醒醒 · BP 拦截弹窗 v0.7.12.2 · 表单版
 *
 * 触发条件：用户聊天中点「出诊断书」按钮，但被后端 gate 拦下（HTTP 422）
 *
 * 用户在弹窗里直接答缺的题，三选一：
 *   1. 答完出诊断书 → 答案合并塞回对话流 → force=true 出 BP
 *   2. 跳过这俩硬出 → 不答，直接 force=true 出 BP（带「未充分会诊」水印）
 *   3. 关闭 → 啥也不做
 *
 * 设计原则：
 *   - 弹窗内闭环，不依赖回到主对话流让用户去答
 *   - 答案为空也允许提交 → 走"硬出"路径
 *   - 调 bridge 拿三档差异化的姐姐口吻 prompt
 *   - LLM 失败用静态兜底，保证弹窗永远有内容可填
 */

import { useEffect, useRef, useState } from "react";

export interface MissingQ {
  qid: number;
  name: string;
  blades: number;
}

export interface BridgeQuestion {
  qid: number;
  name: string;
  prompt: string; // 姐姐口吻的两段式追问
}

interface Props {
  open: boolean;
  message: string;
  missingQuestions: MissingQ[];
  /** 调 bridge 拿到的具体追问问题；undefined 表示还在加载 */
  bridgeQuestions: BridgeQuestion[] | undefined;
  bridgeLoading: boolean;
  gate?: {
    missingRounds: number;
    missingCoverage: number;
    currentTurns: number;
    currentCoverage: number;
  };
  loadingSubmit?: boolean; // 提交答案 + 出 BP 中
  loadingForce?: boolean; // 跳过直接出 BP 中
  onSubmitAnswers: (answers: Record<number, string>) => void;
  onForceSkip: () => void;
  onClose: () => void;
}

export function BPGateDialog({
  open,
  message,
  missingQuestions,
  bridgeQuestions,
  bridgeLoading,
  gate,
  loadingSubmit,
  loadingForce,
  onSubmitAnswers,
  onForceSkip,
  onClose,
}: Props) {
  // 每题答案
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const firstTextareaRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // 弹窗打开时清空旧答案
  useEffect(() => {
    if (open) {
      setAnswers({});
    }
  }, [open]);

  // 加载完毕后聚焦第一个 textarea
  useEffect(() => {
    if (open && bridgeQuestions && bridgeQuestions.length > 0) {
      setTimeout(() => firstTextareaRef.current?.focus(), 80);
    }
  }, [open, bridgeQuestions]);

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loadingSubmit && !loadingForce) {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, loadingSubmit, loadingForce, onClose]);

  if (!open) return null;

  const busy = loadingSubmit || loadingForce;
  const questionsList = bridgeQuestions ?? [];
  const hasAnyAnswer = Object.values(answers).some((v) => v.trim().length > 0);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bp-gate-title"
    >
      {/* 背景遮罩 */}
      <button
        type="button"
        aria-label="关闭"
        className="fixed inset-0 bg-black/65 backdrop-blur-sm"
        onClick={() => !busy && onClose()}
        disabled={busy}
      />

      {/* 弹窗主体 · 暗夜玫瑰风 */}
      <div
        ref={dialogRef}
        className="relative w-full max-w-lg my-4 sm:my-0 rounded-2xl border border-xx-border-soft bg-xx-bg-2 shadow-2xl overflow-hidden"
      >
        {/* 顶部色带 */}
        <div className="h-1 bg-gradient-to-r from-xx-rose via-xx-gold to-xx-purple" />

        <div className="p-5 sm:p-6">
          {/* 标题 */}
          <h2
            id="bp-gate-title"
            className="font-serif text-lg sm:text-xl font-bold text-xx-text leading-snug mb-2"
          >
            等等——姐还有 {missingQuestions.length} 件事要问你
          </h2>

          {/* 说明文 */}
          <p className="text-sm text-xx-text-mid leading-relaxed mb-5">
            {message ||
              "把下面这几个口子堵上，姐立刻给你写一份能晒的诊断书。"}
          </p>

          {/* 加载态 */}
          {bridgeLoading && (
            <div className="py-8 text-center text-xs text-xx-text-dim font-display tracking-wider">
              <div className="inline-block w-4 h-4 border-2 border-xx-rose border-t-transparent rounded-full animate-spin mr-2 align-middle" />
              姐想想怎么问……
            </div>
          )}

          {/* 表单区 */}
          {!bridgeLoading && questionsList.length > 0 && (
            <div className="space-y-5 mb-5">
              {questionsList.map((q, idx) => (
                <div key={q.qid} className="space-y-2">
                  {/* 主题名 */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-xx-rose font-display text-sm font-semibold shrink-0">
                      {idx + 1}.
                    </span>
                    <span className="font-serif text-sm sm:text-base font-bold text-xx-text">
                      「{q.name}」
                    </span>
                  </div>

                  {/* 追问 prompt */}
                  <p
                    className="text-xs sm:text-sm text-xx-text-mid leading-relaxed pl-5 whitespace-pre-line"
                  >
                    {q.prompt}
                  </p>

                  {/* 答案输入框 */}
                  <textarea
                    ref={idx === 0 ? firstTextareaRef : undefined}
                    value={answers[q.qid] ?? ""}
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [q.qid]: e.target.value,
                      }))
                    }
                    disabled={busy}
                    placeholder="（可填可不填，不填就跳过这题）"
                    rows={3}
                    className="ml-5 block w-[calc(100%-1.25rem)] px-3 py-2.5 rounded-xl bg-xx-bg-3/40 border border-xx-border-soft text-sm text-xx-text placeholder:text-xx-text-dim/60 focus:border-xx-rose/50 focus:outline-none focus:ring-1 focus:ring-xx-rose/30 disabled:opacity-60 disabled:cursor-not-allowed transition-colors leading-relaxed"
                  />
                </div>
              ))}
            </div>
          )}

          {/* 进度小字 */}
          {gate && !bridgeLoading && (
            <p className="text-[11px] text-xx-text-dim mb-4 font-display tracking-wider">
              当前 {gate.currentTurns} 轮 · 已聊到 {gate.currentCoverage}/12 题
            </p>
          )}

          {/* 按钮区 */}
          <div className="flex flex-col gap-2.5">
            {/* 主按钮：答完出 BP */}
            <button
              type="button"
              onClick={() => onSubmitAnswers(answers)}
              disabled={busy || bridgeLoading}
              className="w-full px-4 py-3 rounded-xl bg-xx-rose text-white font-display text-sm tracking-wide hover:bg-xx-rose/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loadingSubmit
                ? "姐这就给你写……"
                : hasAnyAnswer
                ? "答完了，给姐写诊断书"
                : "（没填也行）写诊断书"}
            </button>

            {/* 次按钮：跳过直接硬出 */}
            <button
              type="button"
              onClick={onForceSkip}
              disabled={busy || bridgeLoading}
              className="w-full px-4 py-3 rounded-xl border border-xx-border-soft bg-transparent text-xx-text-mid font-display text-sm tracking-wide hover:bg-xx-bg-3/50 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loadingForce
                ? "硬写中……"
                : "跳过这俩，硬要现在出（带「未充分会诊」水印）"}
            </button>

            {/* 关闭 */}
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="w-full px-4 py-2 text-xs text-xx-text-dim hover:text-xx-text-mid transition-colors disabled:opacity-60"
            >
              算了，我再想想
            </button>
          </div>

          {/* 调性小字 */}
          <p className="mt-4 text-[10.5px] text-xx-text-dim/70 italic font-serif text-center leading-relaxed">
            姐不是为难你——是为难那份诊断书。
          </p>
        </div>
      </div>
    </div>
  );
}
