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

/**
 * v0.7.9.5：关键词自动高亮白名单
 *
 * 设计原则：
 *   - 只覆盖明显的"行业符号"——竞品名 / 增长术语 / 钱数百分比
 *   - 不覆盖通用词（"产品" "用户" "增长"）避免高亮过度变成 PPT 风
 *   - 中文/英文/数字混合都覆盖
 */
const KEYWORD_PATTERNS: { pattern: RegExp; replace: string }[] = [
  // 1. 主流竞品名（精确字符串，区分大小写敏感）
  {
    pattern:
      /\b(Character\.AI|Replika|GPT-4o|GPT-4|GPT-5|ChatGPT|Claude|Gemini|Sora|DeepSeek|Notion|Canva|Figma|Midjourney|Stable Diffusion|Boss直聘|拉勾|前程无忧|脉脉|小红书|抖音|微信|公众号|知乎|B站|淘宝|京东|拼多多|美团|饿了么|滴滴|微博|快手|TikTok|Instagram|YouTube|Twitter|Reddit|LinkedIn|WPS|Office)\b/g,
    replace: "**$1**",
  },
  // 2. 增长 / 商业术语（中英文）
  {
    pattern:
      /\b(CAC|LTV|PMF|DAU|MAU|GMV|MRR|ARR|ARPU|CTR|CVR|ROI|ROAS|NPS|MVP|PRD|JTBD|BMC|SaaS|Unit Economics|cohort)\b/g,
    replace: "**$1**",
  },
  // 3. 数字 + 百分比 / 倍数（如 80%、3.5x、10倍）
  {
    pattern: /(\d+(?:\.\d+)?)(%|×|倍|x)/g,
    replace: "**$1$2**",
  },
  // 4. 数字 + 万/亿/k/m （金额规模）
  {
    pattern: /(\d+(?:\.\d+)?)(万|亿|千万|百万|k元|w元|K|M|w)\b/g,
    replace: "**$1$2**",
  },
];

/**
 * 自动加粗关键词（仅作用于未在 ** 或 ` 内的纯文本片段）
 *
 * 实现：先按 ** 和 ` 切分成 [文本, 已加粗段, 文本, 代码段...] 数组，
 *      只对"非加粗非代码"片段做关键词替换，再拼回。
 */
function autoHighlightKeywords(text: string): string {
  if (!text) return text;
  // 用一个分割正则同时切 `xxx`（行内代码）、```xxx```（代码块）、**xxx**（已加粗）
  // 切完之后偶数 index 是普通文本可以加粗，奇数 index 是已包裹片段保留原样
  const parts = text.split(
    /(```[\s\S]*?```|`[^`\n]*`|\*\*[^*\n]+\*\*)/g
  );
  return parts
    .map((part, i) => {
      if (i % 2 === 1) return part; // 已包裹片段原样
      let processed = part;
      for (const { pattern, replace } of KEYWORD_PATTERNS) {
        processed = processed.replace(pattern, replace);
      }
      return processed;
    })
    .join("");
}

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

  // v0.7.9.5：关键词自动高亮（仅 AI 消息）
  // 把已知竞品名 / 术语 / 数字+% 自动包成 markdown `**` 加粗，复用 .markdown-body strong 的玫瑰金样式。
  // 边界保护：
  //   - 若关键词已在 ` ` 反引号包裹里（code）→ 不再加 ** （避免破坏代码）
  //   - 若关键词已在 ** ** 内 → 跳过（避免重复加粗破坏语法）
  //   - 用 \b 边界匹配英文，中文用前后非 ** 守卫
  const highlightedContent = useMemo(() => {
    if (isUser) return safeContent;
    return autoHighlightKeywords(safeContent);
  }, [isUser, safeContent]);

  if (isUser) {
    return (
      <div className="flex justify-end fade-in">
        <div className="max-w-[min(72%,520px)] rounded-[18px] rounded-tr-[6px] border border-xx-border/60 bg-xx-bg-2/70 px-4 py-2.5 text-sm text-xx-text/90 whitespace-pre-wrap leading-relaxed">
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
            "ai-bubble rounded-[20px] rounded-tl-[6px] border bg-xx-bg-2/92 backdrop-blur-sm px-5 py-4",
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
              <span className="loading-persona" data-mode={message.mode || "scathing"}>
                <span className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
                <span className="loading-text">
                  {message.mode === "casual"
                    ? "姐正在嫌弃你的想法……"
                    : message.mode === "rational"
                    ? "姐正在核算你的逻辑……"
                    : "姐正在翻你的旧账……"}
                </span>
              </span>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {highlightedContent}
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
