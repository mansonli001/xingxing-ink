"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState, useMemo } from "react";
import { AudioPlayer } from "./AudioPlayer";
import type { ModeId } from "./modeMeta";
import { MODE_META } from "./modeMeta";
import { sanitizeLLMOutput } from "@/lib/prompts/sanitizer";

// TTS 总开关：默认关闭。配置 NEXT_PUBLIC_TTS_ENABLED=true 才启用语音
const TTS_ENABLED = process.env.NEXT_PUBLIC_TTS_ENABLED === "true";

export interface ChatMessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** AI 回复完成（不再流式） */
  done: boolean;
  /** 这条消息所属的模式（影响着色） */
  mode?: ModeId;
  /**
   * v0.4.2：预制音频直链（如 /preset-voices/casual-0.mp3）。
   * 当用户点击 EmptyState 的 9 个引导 tip 之一时，首轮回复直接用预制 mp3，
   * 跳过 /api/tts 合成，0 延迟、0 调用开销。
   */
  presetAudio?: string;
}

interface MessageBubbleProps {
  message: ChatMessageItem;
  /** 是否为最新一条 AI 消息（保留参数、MVP 不再自动播音） */
  isLatestAssistant?: boolean;
  /** 点击「追问这一段」时的回调：把 AI 那句话引用到输入框 */
  onQuoteReply?: (quotedText: string) => void;
  /** 上传播放状态到 Chat：供人像呼吸动效订阅（v0.4） */
  onSpeakingChange?: (speaking: boolean) => void;
}

export function MessageBubble({
  message,
  isLatestAssistant,
  onQuoteReply,
  onSpeakingChange,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const meta = message.mode ? MODE_META[message.mode] : MODE_META.scathing;
  const [copied, setCopied] = useState(false);

  // v0.7.9.5：渲染前兜底过滤 LLM 输出污染（内部 anchor 词整段 strip + 行首 emoji marker 剥离）
  // 后端 SSE 已经做过一次（lib/prompts/sanitizer.ts），前端再做一次双保险。
  // 仅对 AI 消息生效；用户消息原样保留。
  const safeContent = useMemo(
    () => (isUser ? message.content : sanitizeLLMOutput(message.content)),
    [isUser, message.content]
  );

  if (isUser) {
    return (
      <div className="flex justify-end fade-in">
        <div className="max-w-[min(72%,520px)] rounded-2xl rounded-tr-sm border border-xx-border bg-xx-bg-2 px-4 py-2.5 text-sm text-xx-text whitespace-pre-wrap leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(safeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* 忽略 */
    }
  }

  /**
   * v0.7.3：点击「追问这一段」= 一键直发追问
   *
   * 从 AI 回复里挑选最合适的"锚点句"——优先级：
   * 1. 最后一句疑问句（通常是收尾 forced choice，最值得追）
   * 2. 带「？」的最短句（核心反问）
   * 3. 降级为第一句
   *
   * 锚点最多 60 字，超出截断加"…"。
   */
  function handleQuote() {
    const raw = safeContent.trim();
    // 按句号/问号/感叹号切句，保留标点
    const sentences = raw
      .split(/(?<=[。！？?!])\s*/)
      .map((s) => s.trim())
      .filter(Boolean);

    let anchor = "";

    // 优先：最后一句带问号的（通常是收尾 forced choice）
    for (let i = sentences.length - 1; i >= 0; i--) {
      if (/[？?]/.test(sentences[i])) {
        anchor = sentences[i];
        break;
      }
    }

    // 降级：带问号的最短句
    if (!anchor) {
      const questionSents = sentences.filter((s) => /[？?]/.test(s));
      if (questionSents.length > 0) {
        anchor = questionSents.reduce((a, b) => (a.length <= b.length ? a : b));
      }
    }

    // 再降级：第一句
    if (!anchor) {
      anchor = sentences[0] || raw.slice(0, 60);
    }

    // v0.7.7：清除 markdown 符号再截断
    //   用户气泡里不该出现 **加粗** / *斜体* / # 标题 / > 引用 / `代码` 这些原始 md 符号
    anchor = anchor
      .replace(/\*\*([^*]+)\*\*/g, "$1")  // **bold** → bold
      .replace(/\*([^*]+)\*/g, "$1")       // *italic* → italic
      .replace(/`([^`]+)`/g, "$1")         // `code` → code
      .replace(/^#+\s*/g, "")              // ### 标题 → 标题
      .replace(/^>\s*/g, "")               // > 引用 → 引用
      .replace(/[\[\]「」""]/g, "")        // 去掉会和话术模板冲突的成对引号
      .replace(/\s+/g, " ")                // 多空格合并
      .trim();

    // 长度截断
    if (anchor.length > 60) {
      anchor = anchor.slice(0, 58) + "…";
    }

    onQuoteReply?.(anchor);
  }

  const showActions = message.done && message.content.length > 0;

  return (
    <div className="flex justify-start fade-in">
      <div className="max-w-[min(94%,560px)] w-full">
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className={["h-1.5 w-1.5 rounded-full", meta.dotColor].join(" ")}
          />
          <span className="text-xs text-xx-text-dim font-serif tracking-wider">
            醒醒 · {meta.label}
          </span>
        </div>
        <div
          className={[
            "rounded-2xl rounded-tl-sm border bg-xx-bg-2/92 backdrop-blur-sm px-4 py-3",
            "border-xx-border",
          ].join(" ")}
        >
          <div
            className={[
              "markdown-body",
              !message.done && message.content.length === 0
                ? "text-xx-text-dim"
                : "",
              !message.done && message.content.length > 0
                ? "typing-cursor"
                : "",
            ].join(" ")}
          >
            {message.content.length === 0 && !message.done ? (
              <span className="italic">醒醒正在打字……</span>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {safeContent}
              </ReactMarkdown>
            )}
          </div>
          {/* v0.4.2.4：
              · 预制音频（presetAudio）：始终显示播放器（不受 TTS_ENABLED 控制），
                让首屏 9 个 tip 都能听到，并通过 onSpeakingChange 触发人像呼吸
              · 真实 TTS 合成：仅在 NEXT_PUBLIC_TTS_ENABLED=true 时显示 */}
          {message.done &&
          message.content.length > 0 &&
          (TTS_ENABLED || message.presetAudio) ? (
            <AudioPlayer
              text={safeContent}
              mode={message.mode || "casual"}
              autoPlay={false}
              onPlayingChange={onSpeakingChange}
              presetAudioUrl={message.presetAudio}
            />
          ) : null}
        </div>
        {showActions ? (
          <div className="mt-2 flex items-center gap-3 text-[11px] text-xx-text-dim">
            <button
              type="button"
              onClick={handleQuote}
              className="inline-flex items-center gap-1 hover:text-xx-gold transition-colors"
              title="引用这句话继续追问"
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
                <path d="M3 10h7V4H3z" />
                <path d="M14 10h7V4h-7z" />
                <path d="M7 14v6" />
                <path d="M18 14v6" />
              </svg>
              追问这一段
            </button>
            <span className="text-xx-border">·</span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 hover:text-xx-gold transition-colors"
              title="复制全文"
            >
              {copied ? "已复制" : "复制"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
