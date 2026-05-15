"use client";

/**
 * Chat 顶部进度提示（v0.7.12.0 新增）
 *
 * 设计目标（外部专家评测意见 #18 转译吸收）：
 *   - 在对话第 3/6/9 轮触发一次小行进度提醒
 *   - 不露 Q 编号 / 不暴露内部账本结构（保持野生感）
 *   - sessionStorage 记录已触发的轮次，避免同一会话重复闪烁
 *   - 视觉极淡：弱化色 + 上下空隙，不抢戏
 *
 * 文案（与 lib/diagnosis/bp-gate.ts describeRemainingPieces 一致风格）：
 *   - 第 3 轮："姐还在听你讲——再聊几轮，姐才能给你写诊断书"
 *   - 第 6 轮："聊到这儿差不多够了，再补几个具体场景，姐能写得更狠"
 *   - 第 9 轮："你已经聊得不少——再补一两块拼图就能出 BP 了"
 *
 * 触发逻辑：
 *   - turnCount === 3 / 6 / 9 时显示 800ms 后淡出（自动消失）
 *   - sessionStorage key = `progress-hint:${sessionId}:${turn}`
 *
 * 依赖：纯客户端组件，不调任何 API（保持极轻）
 */

import { useEffect, useState } from "react";

interface ChatProgressHintProps {
  turnCount: number;
  sessionId?: string;
}

const TRIGGER_TURNS = new Set([3, 6, 9]);

const HINT_TEXT: Record<number, string> = {
  3: "姐还在听你讲——再聊几轮，姐才能给你写诊断书。",
  6: "聊到这儿差不多够了，再补几个具体场景，姐能写得更狠。",
  9: "你已经聊得不少——再补一两块拼图就能出 BP 了。",
};

export function ChatProgressHint({ turnCount, sessionId }: ChatProgressHintProps) {
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!TRIGGER_TURNS.has(turnCount)) return;

    // sessionStorage 防重复（同会话同轮次只触发一次）
    const sid = sessionId || "anon";
    const storageKey = `progress-hint:${sid}:${turnCount}`;
    try {
      if (sessionStorage.getItem(storageKey)) return;
      sessionStorage.setItem(storageKey, "1");
    } catch {
      // 隐私模式下 sessionStorage 不可用，仍然触发一次
    }

    setText(HINT_TEXT[turnCount] || "");
    setVisible(true);

    // 6 秒后自动淡出
    const timer = window.setTimeout(() => {
      setVisible(false);
    }, 6000);

    return () => window.clearTimeout(timer);
  }, [turnCount, sessionId]);

  if (!visible || !text) return null;

  return (
    <div
      className="chat-progress-hint"
      role="status"
      aria-live="polite"
    >
      <span className="hint-dot" aria-hidden />
      {text}
      <style jsx>{`
        .chat-progress-hint {
          font-family: "Cormorant Garamond", "Noto Serif SC", "Songti SC", serif;
          font-style: italic;
          font-weight: 500;
          font-size: 12px;
          letter-spacing: 0.06em;
          color: rgba(212, 175, 122, 0.72);
          text-align: center;
          padding: 8px 16px 6px;
          margin: 0 auto;
          max-width: 560px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          animation: hint-fade-in 500ms ease-out, hint-fade-out 500ms ease-in 5500ms forwards;
        }
        .hint-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: rgba(212, 175, 122, 0.6);
          animation: hint-pulse 1.8s ease-in-out infinite;
          flex-shrink: 0;
        }
        @keyframes hint-fade-in {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes hint-fade-out {
          to {
            opacity: 0;
            transform: translateY(-2px);
          }
        }
        @keyframes hint-pulse {
          0%,
          100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .chat-progress-hint {
            animation: none;
          }
          .hint-dot {
            animation: none;
          }
        }
        @media (max-width: 499px) {
          .chat-progress-hint {
            font-size: 11px;
            letter-spacing: 0.04em;
            padding: 6px 12px 4px;
          }
        }
      `}</style>
    </div>
  );
}
