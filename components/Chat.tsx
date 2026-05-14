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
import { MicInput } from "./MicInput";
import { StatsBanner } from "./StatsBanner";
import { track } from "../lib/analytics";
import { DrawerTriggerButton } from "./SideDrawer";

interface ChatProps {
  mode: ModeId;
  onModeChange: (mode: ModeId) => void;
  messages: ChatMessageItem[];
  streaming: boolean;
  turnCount: number;
  sendMessageWith: (text: string) => Promise<void> | void;
  clearAll: () => void;
  /** v0.7.9.6：打开抽屉式侧栏（trigger 按钮挂在顶部状态栏左侧） */
  onOpenDrawer?: () => void;
}

export function Chat({
  mode,
  onModeChange,
  messages,
  streaming,
  turnCount,
  sendMessageWith,
  clearAll,
  onOpenDrawer,
}: ChatProps) {
  const [input, setInput] = useState("");
  /** v0.4：当前是否有 AI 消息在播放语音（驱动人像呼吸动效） */
  const [isSpeaking, setIsSpeaking] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 自动滚动
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  /**
   * v0.7.3：点击 AI 消息的「追问这一段」= 一键直发
   *
   * 旧实现（bug）：截 AI 第一句塞输入框，用户直接按发送 → AI 收到的是"用户引用自己话"，
   *                下一轮又把第一句塞回去 → 死循环。
   * 新实现：直接构造一条自然话术的用户消息发出去，不经输入框。
   *         后端 route.ts 检测 __FOLLOWUP__ 标记注入 DIRECTOR_NOTE 让 AI 深挖。
   */
  async function handleFollowUp(anchor: string) {
    if (streaming) return;
    // 埋点：用户点了「追问这一段」（核心交互——衡量内容是否被深读）
    track("followup_clicked", {
      mode,
      turn_index: turnCount,
      // 锚点长度区间（不传原文）
      anchor_len: anchor.length,
    });
    // 内部标记：给后端识别这是追问一键直发，不是普通用户消息
    // 格式：__FOLLOWUP__|锚点|自然话术
    const utterance = `就你刚才说的「${anchor}」——再深挖一层，别换话题、别重复你说过的话。`;
    const payload = `__FOLLOWUP__|${anchor}|${utterance}`;
    await sendMessageWith(payload);
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
      {/* 全屏剪影背景 —— 视口级 fixed，滚动不跟跑、气泡区独立滚动
          放在最外层最前面，z-0 打底 */}
      <SilhouetteBackdrop
        mode={mode}
        hasMessages={messages.length > 0}
        speaking={isSpeaking}
        turnCount={turnCount}
      />

      {/* 顶部：对话中显示"杠精风格"徽章（产品名 + 当前人格 + 轮次） */}
      {locked ? (
        <div className="relative z-10 px-4 sm:px-6 pt-3 pb-2 flex items-center justify-between border-b border-xx-border bg-xx-bg/85 backdrop-blur-sm">
          <div className="flex items-center gap-3 flex-wrap">
            {onOpenDrawer ? <DrawerTriggerButton onClick={onOpenDrawer} /> : null}
            <h2 className="chat-session-title">
              醒醒
            </h2>
            {/* v0.7.9.5：档位 pill 醒目化（带主题色背景 + 圆点 + 发光），让用户一眼识别当前档 */}
            <span className="mode-pill" aria-label={`当前档位：${currentMeta.label}`}>
              {currentMeta.label}
            </span>
            <span className="chat-round-indicator">
              第 <span className="font-medium" style={{ color: "var(--mode-color)" }}>{turnCount}</span> 轮过招
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

      {/* 消息列表 */}
      <div
        ref={listRef}
        className="relative z-0 flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-6"
      >
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
                onQuoteReply={handleFollowUp}
                onSpeakingChange={setIsSpeaking}
                onPickOption={(letter) => sendMessageWith(letter)}
                streaming={streaming}
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
          {/* v0.7.9.7.7：ShareButton 已挪到 Header 右上角，输入框区域恢复纯净 */}
          <div className="input-mode-focus flex items-end gap-2 rounded-xl border border-xx-border bg-xx-bg-2 px-3 py-2.5 transition-colors">
            <MicInput
              disabled={streaming}
              onTranscript={(text) => {
                setInput((prev) => {
                  const sep = prev && !prev.endsWith(" ") ? " " : "";
                  return prev + sep + text;
                });
                // 让用户立刻能看到 / 编辑
                inputRef.current?.focus();
              }}
            />
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={2}
              placeholder={
                turnCount > 0
                  ? mode === "scathing"
                    ? "还没被扇够？继续。"
                    : mode === "rational"
                    ? "别绕弯子，说重点。"
                    : "想清楚了再回我。"
                  : mode === "scathing"
                  ? "把你最得意的那个 idea 丢过来。我专挑你没敢看的那一页。"
                  : mode === "rational"
                  ? "说。我只问一句——谁付钱，付多少，付几次。"
                  : "又有新想法？说说看…（上次那个呢）"
              }
              disabled={streaming}
              /* 关键：手机端字号必须 ≥16px，否则 iOS/Android 浏览器
                 会在聚焦时自动放大整个页面，输入完无法缩回
                 font-size 用内联 style 强覆盖，保证不被任何规则压低 */
              style={{ fontSize: "16px" }}
              className="flex-1 resize-none bg-transparent text-xx-text placeholder:text-xx-text-dim outline-none max-h-40 leading-relaxed"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={streaming || !input.trim()}
              className={[
                "shrink-0 rounded-md px-3.5 py-1.5 text-sm font-medium transition-all",
                streaming || !input.trim()
                  ? "bg-xx-border text-xx-text-dim cursor-not-allowed"
                  : "send-btn-mode",
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
  /** tips 设计原则（2026-05-10 v2）：
   *   三档示例不是"idea 难度的升级"，是"用户处境的不同"——
   *   让用户看完能对号入座，立刻知道"我这种情况选哪档"。
   *
   *   随便聊 = 我脑子里在飘点子（她戳你行为层：你上次那个呢）
   *   讲道理 = 我已经有点雏形要验 （她戳你证据层：数据呢）
   *   扇巴掌 = 我有个"改变世界"的幻觉（她戳你动机层：你在逃什么）
   */
  const tips: Record<ModeId, string[]> = {
    casual: [
      "今天突然想做个陪伴类 AI",
      "我又想做自媒体了",
      "我打算开个小红书账号记录日常",
    ],
    rational: [
      "我做了个 PRD，用户画像是月薪 1-2 万打工人",
      "我调研了 30 个朋友都说愿意付费",
      "MVP 预算 50 万，3 个月上线，拆给我看",
    ],
    scathing: [
      "我要做下一个 DeepSeek",
      "我要 all in 辞职去做 AI 创业",
      "我这个 idea 绝对能干掉抖音",
    ],
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 min-h-[55dvh] pt-8 sm:pt-0">
      <div className="logo-serif text-5xl sm:text-6xl mb-3 leading-none">
        醒醒
      </div>
      <div className="text-xx-text-dim text-sm mb-1 font-serif italic tracking-wider">
        别做梦了
      </div>
      {/* v0.7.9.2：替换原 LOADING IN PROGRESS 小字为运营数据条
           · 保留顶栏右上角的 LOADING IN PROGRESS 作为个人签名
           · 这里换成实时统计：让访客感到"真有人在用" */}
      <StatsBanner />
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
