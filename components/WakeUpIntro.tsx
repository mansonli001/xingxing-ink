"use client";

import { useEffect, useState, useCallback } from "react";
import { track } from "../lib/analytics";

/**
 * WakeUpIntro —— 醒醒开场动画
 * 节奏：4.5s 完整演出，按钮在 3.8s 浮起
 *
 * 设计原则：
 * 1. 四句"我觉得"要看得清——给足 1.5s 堆叠 + 200ms 充满感停顿
 * 2. "醒醒"要够大够久——大字号 + 1.4s 呼吸，错过都难
 * 3. 三道防跳出保险：
 *    a. 右上角"跳过"按钮（0.5s 后出现）
 *    b. sessionStorage 同会话只播一次
 *    c. ESC / 点击空白处 / 按钮 → 立即结束
 *
 * 时间轴（毫秒）：
 *   0     第一句切入
 *   500   第二句
 *   1000  第三句
 *   1500  第四句 → 充满
 *   2700  四句开始抖动（第四句出来后多停 1.2s 让人看清）
 *   3000  模糊消散
 *   3100  黑屏 100ms
 *   3200  "醒醒" 砸入（无句号、加粗、放大）
 *   3700  停 1.4s 呼吸（让冲击留下来）
 *   4600  副标题浮出
 *   5100  按钮浮起
 */
export function WakeUpIntro({ onDone }: { onDone: () => void }) {
  // 阶段：phase 用 number，避免 string 比较错位
  // 0 黑屏  1 第一句  2 第二句  3 第三句  4 第四句  5 模糊抖
  // 6 全黑(100ms)  7 醒醒砸入  8 呼吸  9 停止一切  10 按钮浮起
  const [phase, setPhase] = useState(0);
  const [showSkip, setShowSkip] = useState(false);

  /**
   * @param reason  "auto" = 用户看完动画走到底自然结束 ｜ "skip" = 用户主动跳过
   *                 不传时按当前 phase 自动判断（phase>=10 视为已看完）
   */
  const finish = useCallback(
    (reason?: "auto" | "skip") => {
      try {
        sessionStorage.setItem("xx_intro_played", "1");
      } catch {
        // 隐私模式 sessionStorage 不可用，忽略
      }
      // phase>=10 = 主按钮已经浮起，认为用户看到了完整动画
      const finalReason = reason ?? (phase >= 10 ? "auto" : "skip");
      track(finalReason === "skip" ? "intro_skipped" : "intro_played", {
        // 跳过时记录用户在哪一阶段跳的（0-10）
        phase,
      });
      onDone();
    },
    [onDone, phase]
  );

  // 时间轴推进
  useEffect(() => {
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => {
      timers.push(window.setTimeout(fn, ms));
    };

    at(0, () => setPhase(1));
    at(500, () => setPhase(2));
    at(1000, () => setPhase(3));
    at(1500, () => setPhase(4));
    at(2700, () => setPhase(5));
    at(3000, () => setPhase(6));
    at(3200, () => setPhase(7));
    at(3700, () => setPhase(8));
    at(4600, () => setPhase(9));
    at(5100, () => setPhase(10));
    // 跳过按钮 0.5s 后出现
    at(500, () => setShowSkip(true));

    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  // 键盘：ESC / 空格 / Enter 跳过
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [finish]);

  // 第 4 句出来后允许整屏点击跳过（避免误触前面三句还没看完）
  const canClickToSkip = phase >= 4;

  return (
    <div
      className="fixed inset-0 z-[100] bg-xx-bg flex items-center justify-center overflow-hidden cursor-default"
      onClick={canClickToSkip ? () => finish("skip") : undefined}
      style={{ cursor: canClickToSkip ? "pointer" : "default" }}
    >
      {/* 玫瑰光晕底（极淡） */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(232,180,184,0.06), transparent 70%)",
        }}
      />

      {/* 跳过按钮 */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          finish("skip");
        }}
        className={`absolute top-5 right-5 sm:top-7 sm:right-8 text-[11px] tracking-[0.3em] font-display text-xx-text-dim hover:text-xx-rose transition-all duration-300 ${
          showSkip ? "opacity-70" : "opacity-0 pointer-events-none"
        }`}
      >
        跳过 →
      </button>

      {/* 第一幕：4 句"我觉得"堆叠 */}
      {phase >= 1 && phase <= 5 && (
        <div
          className={`relative w-full max-w-[820px] px-6 sm:px-10 flex flex-col items-center gap-5 sm:gap-7 transition-all duration-200 ${
            phase === 5 ? "blur-[2px] animate-[shake_0.15s_ease-in-out_infinite]" : ""
          }`}
        >
          <Line text="我的想法很值钱。" show={phase >= 1} delay={0} />
          <Line text="我觉得这个 idea 能做成。" show={phase >= 2} delay={0} />
          <Line text="我觉得用户会喜欢。" show={phase >= 3} delay={0} />
          <Line text="我觉得应该先做这个。" show={phase >= 4} delay={0} />
        </div>
      )}

      {/* 第二幕：醒醒 + 停止一切「我觉得」 */}
      {phase >= 7 && (
        <div className="relative flex flex-col items-center justify-center gap-10 sm:gap-14 px-6 text-center w-full">
          {/* 醒醒——砸入式（无句号、超大、加粗、占满屏） */}
          <h1
            className={`logo-serif font-black text-[120px] sm:text-[180px] md:text-[220px] leading-none tracking-[0.04em] ${
              phase === 7 ? "animate-slam-in" : ""
            }`}
            style={{
              filter: "drop-shadow(0 6px 36px rgba(232,180,184,0.4))",
              fontWeight: 900,
            }}
          >
            醒醒
          </h1>

          {/* 停止一切「我觉得」 */}
          <div
            className={`transition-all duration-500 ${
              phase >= 9 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
            }`}
          >
            <p className="font-serif text-xl sm:text-2xl text-xx-text tracking-[0.08em]">
              停止一切{" "}
              <span className="text-xx-rose font-semibold">「我觉得」</span>
              。
            </p>
          </div>

          {/* 按钮：你的想法敢丢进来吗？（挑衅 + 勾引） */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              finish();
            }}
            className={`mt-2 sm:mt-4 px-7 py-3 rounded-full border border-xx-rose/60 bg-xx-bg-2/60 backdrop-blur text-xx-rose font-serif text-base sm:text-lg tracking-[0.06em] hover:bg-xx-rose/15 hover:border-xx-rose hover:shadow-[0_0_28px_-4px_rgba(232,180,184,0.55)] transition-all duration-300 ${
              phase >= 10
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-2 pointer-events-none"
            }`}
          >
            你的想法敢丢进来吗？ →
          </button>
        </div>
      )}

      {/* 局部动画 keyframes */}
      <style jsx>{`
        @keyframes slam-in {
          0% {
            opacity: 0;
            transform: scale(1.6);
            filter: blur(6px) drop-shadow(0 4px 24px rgba(232, 180, 184, 0.3));
          }
          60% {
            opacity: 1;
            transform: scale(0.95);
            filter: blur(0) drop-shadow(0 4px 24px rgba(232, 180, 184, 0.5));
          }
          100% {
            opacity: 1;
            transform: scale(1);
            filter: blur(0) drop-shadow(0 4px 24px rgba(232, 180, 184, 0.3));
          }
        }
        :global(.animate-slam-in) {
          animation: slam-in 0.25s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-1.5px);
          }
          75% {
            transform: translateX(1.5px);
          }
        }
      `}</style>
    </div>
  );
}

function Line({
  text,
  show,
  delay,
}: {
  text: string;
  show: boolean;
  delay: number;
}) {
  return (
    <p
      className={`font-serif text-xl sm:text-2xl md:text-[30px] text-xx-text-mid tracking-[0.04em] transition-all duration-[400ms] ease-out ${
        show ? "opacity-90 translate-y-0 blur-0" : "opacity-0 translate-y-2 blur-[3px]"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {text}
    </p>
  );
}
