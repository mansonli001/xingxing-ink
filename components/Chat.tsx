"use client";

import { useEffect, useRef, useState } from "react";
import { ModeSelector } from "./ModeSelector";
import {
  MessageBubble,
  type ChatMessageItem,
} from "./MessageBubble";
import type { ModeId } from "./modeMeta";
import { MODE_META } from "./modeMeta";
import { SilhouetteBackdrop } from "./SilhouetteBackdrop";

interface ChatProps {
  mode: ModeId;
  onModeChange: (mode: ModeId) => void;
  messages: ChatMessageItem[];
  streaming: boolean;
  turnCount: number;
  sendMessageWith: (text: string) => Promise<void> | void;
  clearAll: () => void;
}

export function Chat({
  mode,
  onModeChange,
  messages,
  streaming,
  turnCount,
  sendMessageWith,
  clearAll,
}: ChatProps) {
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 自动滚动
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  /** 点击 AI 消息的「追问这一段」：把那句话引用到输入框 */
  function handleQuoteReply(snippet: string) {
    const prefix = `> ${snippet}\n\n`;
    setInput((prev) => {
      if (prev.startsWith(">")) {
        const afterQuote = prev.split(/\n\n/).slice(1).join("\n\n");
        return prefix + afterQuote;
      }
      return prefix + prev;
    });
    setTimeout(() => {
      const el = inputRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    }, 0);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    await sendMessageWith(text);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  }

  // 找到最新一条 AI 消息（done=true）的 id
  const latestAssistantId = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "assistant" && m.done && m.content) return m.id;
    }
    return null;
  })();

  // 对话已经开始（有任何消息）→ 锁定模式卡，不允许切换人格
  const locked = messages.length > 0;
  const currentMeta = MODE_META[mode];

  return (
    <div className="relative flex h-full w-full flex-col" data-mode={mode}>
      {/* 顶部：对话中显示"杠精风格"徽章（产品名 + 当前人格 + 轮次） */}
      {locked ? (
        <div className="relative z-10 px-4 sm:px-6 pt-3 pb-2 flex items-center justify-between border-b border-xx-border bg-xx-bg/85 backdrop-blur-sm">
          <div className="flex items-baseline gap-3">
            <h2 className="chat-session-title">
              醒醒 · <span className="text-white">{currentMeta.label}</span>
            </h2>
            <span className="chat-round-indicator">
              第 <span className="text-xx-gold font-medium">{turnCount}</span> 轮过招
            </span>
          </div>
          <button
            type="button"
            onClick={clearAll}
            className="text-[11px] text-xx-text-dim hover:text-xx-gold transition-colors flex items-center gap-1"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
            清空重开
          </button>
        </div>
      ) : (
        /* 未开始对话：显示模式选择区 */
        <div className="relative z-10 px-4 sm:px-6 pt-4 pb-3 border-b border-xx-border bg-xx-bg">
          <div className="flex items-center justify-between mb-2.5">
            <p className="mode-hint">选择今天想要的醒醒</p>
          </div>
          <ModeSelector
            current={mode}
            onChange={onModeChange}
            disabled={streaming}
            locked={false}
          />
          <p className="mt-2 text-xs text-xx-text-dim leading-relaxed">
            {currentMeta.description}
          </p>
        </div>
      )}

      {/* 消息列表（御姐剪影恒作为全屏背景） */}
      <div
        ref={listRef}
        className="relative z-0 flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4"
      >
        {/* 全屏剪影背景 —— 所有尺寸都显示 */}
        <SilhouetteBackdrop mode={mode} hasMessages={messages.length > 0} />

        {/* 对话安全区：
            - 空状态（无消息）：居中，与右侧人物形成迎宾对称
            - 有消息：左对齐，max-width 55vw，让出右侧给人物 */}
        <div
          className="chat-safe-zone relative z-10 space-y-4"
          data-has-messages={messages.length > 0 ? "true" : "false"}
        >
          {messages.length === 0 ? (
            <EmptyState
              mode={mode}
              onPickTip={(t) => sendMessageWith(t)}
              disabled={streaming}
            />
          ) : (
            messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                isLatestAssistant={m.id === latestAssistantId}
                onQuoteReply={handleQuoteReply}
              />
            ))
          )}
        </div>
      </div>

      {/* 输入框 */}
      <div className="relative z-10 px-4 sm:px-6 pb-5 pt-3 border-t border-xx-border bg-xx-bg/80 backdrop-blur-sm">
        <div
          className="input-safe-zone w-full"
          data-has-messages={messages.length > 0 ? "true" : "false"}
        >
          <div className="flex items-end gap-2 rounded-xl border border-xx-border bg-xx-bg-2 px-3 py-2.5 focus-within:border-xx-gold transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={2}
              placeholder={
                turnCount > 0
                  ? "继续聊 · 或点上一条消息的「追问这一段」"
                  : mode === "scathing"
                  ? "把你的想法丢过来。我等着醒你。"
                  : mode === "rational"
                  ? "想法、PRD、决策——拆给我看。"
                  : "嗯？说说看？"
              }
              disabled={streaming}
              className="flex-1 resize-none bg-transparent text-sm text-xx-text placeholder:text-xx-text-dim outline-none max-h-40"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={streaming || !input.trim()}
              className={[
                "shrink-0 rounded-md px-3.5 py-1.5 text-sm font-medium transition-all",
                streaming || !input.trim()
                  ? "bg-xx-border text-xx-text-dim cursor-not-allowed"
                  : "bg-xx-gold text-xx-bg hover:brightness-110 active:scale-95",
              ].join(" ")}
            >
              {streaming ? "醒醒说话中…" : "送上去"}
            </button>
          </div>
          <p
            className={[
              "mt-2 text-[11px] text-xx-text-dim",
              messages.length > 0 ? "text-left" : "text-center",
            ].join(" ")}
          >
            Enter 送出 · Shift+Enter 换行 · 醒醒不会陪你做梦
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  mode,
  onPickTip,
  disabled,
}: {
  mode: ModeId;
  onPickTip: (text: string) => void;
  disabled?: boolean;
}) {
  const tips: Record<ModeId, string[]> = {
    casual: [
      "我想做一个帮大学生找对象的 App",
      "我打算辞职去做自媒体",
      "我们部门要做一个 AI 中台",
    ],
    rational: [
      "评估一下：做一个面向打工人的副业 SaaS，估值能到多少",
      "我的产品 PRD 在这里：……",
      "我准备 all in 一个新方向，帮我拆一下假设",
    ],
    scathing: [
      "我有一个 idea，绝对能干掉抖音",
      "我准备做下一个 DeepSeek",
      "我要辞职 all in AI 创业",
    ],
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 min-h-[60dvh]">
      <div className="logo-serif text-5xl sm:text-6xl mb-3 leading-none">
        醒醒
      </div>
      <div className="text-xx-text-dim text-sm mb-1 font-serif italic tracking-wider">
        别做梦了
      </div>
      <div className="text-xx-gold text-[11px] tracking-[0.4em] mb-8 font-display font-semibold">
        XINGXING.INK
      </div>
      <div className="w-full max-w-lg space-y-2">
        <p className="text-xs text-xx-text-dim mb-2 font-serif italic tracking-wider">
          可以试试这样开始（点一下直接送进去）
        </p>
        {tips[mode].map((t, i) => (
          <button
            key={i}
            type="button"
            onClick={() => !disabled && onPickTip(t)}
            disabled={disabled}
            className={[
              "group w-full text-sm text-xx-text bg-xx-bg-2/85 backdrop-blur-md border border-xx-border rounded-lg px-4 py-3 fade-in transition-all text-left flex items-center justify-between gap-3 shadow-lg",
              disabled
                ? "opacity-60 cursor-not-allowed"
                : "hover:border-xx-gold/60 hover:bg-xx-bg-2 hover:text-white cursor-pointer active:scale-[0.99]",
            ].join(" ")}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <span>&ldquo;{t}&rdquo;</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 shrink-0 text-xx-text-dim opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-xx-gold transition-all"
              aria-hidden="true"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
