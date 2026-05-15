"use client";

/**
 * 醒醒 · BP 拦截弹窗（v0.7.12.1 新增）
 *
 * 触发条件：用户聊天中点「出诊断书」按钮，但被后端 gate 拦下（HTTP 422）
 *
 * 用户三选一：
 *   1. 继续聊 → 触发 onContinueChat（父组件去调 /api/diagnosis/bridge 注入追问）
 *   2. 强行出 BP → 触发 onForceGenerate（父组件用 force=true 重发 generate）
 *   3. 关闭 → 触发 onClose（用户改主意，啥也不做）
 *
 * 设计原则：
 *   - 不要"错误"感，要"姐拦你一下"感
 *   - 露出最缺的 1-2 题题名（用人话，不露 Q 编号）
 *   - 默认聚焦"继续聊"按钮（推荐路径）
 */

import { useEffect, useRef } from "react";

export interface MissingQ {
  qid: number;
  name: string;
  blades: number;
}

interface Props {
  open: boolean;
  message: string; // 后端 gate.message
  missingQuestions: MissingQ[];
  gate?: {
    missingRounds: number;
    missingCoverage: number;
    currentTurns: number;
    currentCoverage: number;
  };
  loadingContinue?: boolean; // 调 bridge API 中
  loadingForce?: boolean; // 强出 BP 调 generate 中
  onContinueChat: () => void;
  onForceGenerate: () => void;
  onClose: () => void;
}

export function BPGateDialog({
  open,
  message,
  missingQuestions,
  gate,
  loadingContinue,
  loadingForce,
  onContinueChat,
  onForceGenerate,
  onClose,
}: Props) {
  const continueBtnRef = useRef<HTMLButtonElement>(null);

  // 打开时聚焦推荐按钮
  useEffect(() => {
    if (open && continueBtnRef.current) {
      continueBtnRef.current.focus();
    }
  }, [open]);

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loadingContinue && !loadingForce) {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, loadingContinue, loadingForce, onClose]);

  if (!open) return null;

  const busy = loadingContinue || loadingForce;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bp-gate-title"
    >
      {/* 背景遮罩 */}
      <button
        type="button"
        aria-label="关闭"
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
        onClick={() => !busy && onClose()}
        disabled={busy}
      />

      {/* 弹窗主体 · 暗夜玫瑰风 */}
      <div className="relative w-full max-w-md rounded-2xl border border-xx-border-soft bg-xx-bg-2 shadow-2xl overflow-hidden">
        {/* 顶部色带 */}
        <div className="h-1 bg-gradient-to-r from-xx-rose via-xx-gold to-xx-purple" />

        <div className="p-5 sm:p-6">
          {/* 标题 */}
          <h2
            id="bp-gate-title"
            className="font-serif text-lg sm:text-xl font-bold text-xx-text leading-snug mb-2"
          >
            等等——姐还想问你两件事
          </h2>

          {/* 说明文 */}
          <p className="text-sm text-xx-text-mid leading-relaxed mb-4">
            {message}
          </p>

          {/* 缺题列表（露人话题名，不露 Q 编号） */}
          {missingQuestions.length > 0 && (
            <div className="rounded-xl border border-xx-rose/25 bg-xx-rose/[0.06] p-4 mb-5">
              <p className="text-[11px] font-display text-xx-rose/85 mb-2 tracking-wider">
                还没问到的：
              </p>
              <ul className="space-y-1.5">
                {missingQuestions.map((q, i) => (
                  <li
                    key={q.qid}
                    className="flex items-start gap-2 text-sm text-xx-text"
                  >
                    <span className="text-xx-rose/70 font-display shrink-0">
                      {i + 1}.
                    </span>
                    <span>「{q.name}」</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 进度小字 */}
          {gate && (
            <p className="text-[11px] text-xx-text-dim mb-5 font-display tracking-wider">
              当前 {gate.currentTurns} 轮 · 已聊到 {gate.currentCoverage}/12
              题
              {gate.missingRounds > 0 ? ` · 还缺 ${gate.missingRounds} 轮` : ""}
            </p>
          )}

          {/* 按钮区 */}
          <div className="flex flex-col gap-2.5">
            {/* 主按钮：继续聊（推荐） */}
            <button
              ref={continueBtnRef}
              type="button"
              onClick={onContinueChat}
              disabled={busy}
              className="w-full px-4 py-3 rounded-xl bg-xx-rose text-white font-display text-sm tracking-wide hover:bg-xx-rose/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loadingContinue ? "姐想想怎么问……" : "好，继续聊（推荐）"}
            </button>

            {/* 次按钮：强行出 BP */}
            <button
              type="button"
              onClick={onForceGenerate}
              disabled={busy}
              className="w-full px-4 py-3 rounded-xl border border-xx-border-soft bg-transparent text-xx-text-mid font-display text-sm tracking-wide hover:bg-xx-bg-3/50 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loadingForce ? "硬写中……" : "硬要现在出（带「未充分会诊」水印）"}
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

          {/* 调性小字（书卷气，不抢戏） */}
          <p className="mt-4 text-[10.5px] text-xx-text-dim/70 italic font-serif text-center leading-relaxed">
            姐不是为难你——是为难那份诊断书。
          </p>
        </div>
      </div>
    </div>
  );
}
