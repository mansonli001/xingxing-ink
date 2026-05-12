"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState, useMemo, useRef } from "react";
import { AudioPlayer } from "./AudioPlayer";
import type { ModeId } from "./modeMeta";
import { MODE_META } from "./modeMeta";
import { sanitizeLLMOutput, autoBoldQuotedEmphasis } from "@/lib/prompts/sanitizer";
import { KillStamp, extractKillStamp } from "./KillStamp";
import { OptionButtons, extractOptions } from "./OptionButtons";

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
  // 5. v0.7.9.5.4：中文轻术语（仅在"紧跟——也就是"上下文中加粗）
  //    用 lookahead 守卫：必须紧跟 ——也就是 / （也就是 才加粗
  //    这样用户日常说"留存差""转化低"不会被误伤，只有 LLM 按术语铁律输出时才高亮
  {
    pattern:
      /(留存|单位经济模型|核心壁垒|北极星指标|私域|转化)(?=——也就是|（也就是|\(也就是)/g,
    replace: "**$1**",
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
  /** v0.7.9.5.3：点击 ABC 选项按钮时回调（直接当成用户消息发出） */
  onPickOption?: (letter: string) => void;
  /** v0.7.9.5.3：当前是否在流式接收中（禁用选项按钮） */
  streaming?: boolean;
}

export function MessageBubble({
  message,
  isLatestAssistant,
  onQuoteReply,
  onSpeakingChange,
  onPickOption,
  streaming,
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

  // v0.7.9.5.3：剥出 KILL 标记
  // 流式中 KILL 标记可能不完整（[KILL]xxx... 还没收到 [/KILL]），这种情况 extractKillStamp 返回 null
  // → 正文继续走流式渲染，KILL 卡片在 done 之后才出现
  const { content: contentWithoutKill, kill } = useMemo(() => {
    if (isUser) return { content: message.content, kill: null as string | null };
    return extractKillStamp(safeContent);
  }, [isUser, safeContent, message.content]);

  // v0.7.9.5.3：剥出末段 ABC 选项（仅在 done 之后做，避免流式中段误识别）
  // 仅当：①AI 消息已 done ②末段能解出 ≥2 个 ABC 选项 才识别
  // 识别后正文要把末段去掉（避免重复显示）
  const { contentForRender, options } = useMemo(() => {
    if (isUser) return { contentForRender: message.content, options: [] as ReturnType<typeof extractOptions> };
    if (!message.done) return { contentForRender: contentWithoutKill, options: [] as ReturnType<typeof extractOptions> };
    const paras = contentWithoutKill.split(/\n\n/);
    if (paras.length === 0) return { contentForRender: contentWithoutKill, options: [] as ReturnType<typeof extractOptions> };
    const lastPara = paras[paras.length - 1];
    const opts = extractOptions(lastPara);
    if (opts.length >= 2) {
      // 末段是 ABC，从正文剥掉
      return { contentForRender: paras.slice(0, -1).join("\n\n"), options: opts };
    }
    return { contentForRender: contentWithoutKill, options: opts };
  }, [isUser, contentWithoutKill, message.done, message.content]);

  // v0.7.9.5：关键词自动高亮 + v0.7.9.5.3：引号包裹自动加粗（仅 AI 消息）
  // 把已知竞品名 / 术语 / 数字+% 自动包成 markdown `**` 加粗，复用 .markdown-body strong 的玫瑰金样式。
  const highlightedContent = useMemo(() => {
    if (isUser) return contentForRender;
    // 先关键词白名单加粗，再「xxx」/ "xxx" 自动加粗
    return autoBoldQuotedEmphasis(autoHighlightKeywords(contentForRender));
  }, [isUser, contentForRender]);

  // v0.7.9.6：段落级渐入（仅 AI · 流式时让段落"一段段出现"模拟辩手节奏）
  // 切分策略：按 `\n\n` 切段，每段独立渲染为 div + 段索引 key
  // 防闪烁机制：useRef 缓存"已渲染过段数"，content 增量到来时只对新增段加 fade-in class
  // 旧段保持稳定不重跑动画（避免 SSE delta 每 chunk 都让全部段闪烁）
  const segments = useMemo(() => {
    if (isUser) return [highlightedContent];
    if (!highlightedContent) return [];
    return highlightedContent.split(/\n\n/);
  }, [isUser, highlightedContent]);
  const renderedCountRef = useRef(0);

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
      // v0.7.9.5.3：复制时把 KILL 标记还原为「醒醒：xxx」可读形式
      const copyText = kill
        ? `${contentWithoutKill}\n\n醒醒：${kill}`
        : safeContent;
      await navigator.clipboard.writeText(copyText);
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
    // v0.7.9.5.3：锚点从无 KILL 的正文提取（KILL 句太总结性引用没意义）
    const raw = contentWithoutKill.trim();
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
              <>
                <SegmentedMarkdown
                  segments={segments}
                  renderedCountRef={renderedCountRef}
                />
                {/* v0.7.9.5.3：ABC 选项按钮（仅 done 后 + 末段是 ABC 时渲染） */}
                {options.length >= 2 ? (
                  <OptionButtons
                    options={options}
                    mode={message.mode || "scathing"}
                    onPick={onPickOption}
                    disabled={streaming}
                  />
                ) : null}
                {/* v0.7.9.5.3：醒醒盖章句（KillStamp · 流式中可能未到 [/KILL] 暂不渲染） */}
                {kill ? (
                  <KillStamp text={kill} mode={message.mode || "scathing"} />
                ) : null}
              </>
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
              text={kill ? `${contentWithoutKill}。醒醒：${kill}` : safeContent}
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

/**
 * v0.7.9.6 · 段落级渐入渲染器
 *
 * 把 markdown 文本按 `\n\n` 切段，每段独立渲染为 ReactMarkdown，
 * 用 ref 缓存"已渲染过段数"——SSE 增量到来时只对新增段加 fade-in class，
 * 旧段保持稳定不重跑动画。
 *
 * 视觉效果：辩手节奏——段落"一段段出现"模拟"姐姐一刀一刀出"
 * 性能：CSS animation 走 transform/opacity 不触发 layout
 */
function SegmentedMarkdown({
  segments,
  renderedCountRef,
}: {
  segments: string[];
  renderedCountRef: React.MutableRefObject<number>;
}) {
  // 当前回合段数（在每次渲染前快照）
  const prevRendered = renderedCountRef.current;

  // 渲染完成后更新 ref（下次比对用）
  // 注意：在渲染期间不能直接写 ref，但函数式组件 return 之后浏览器渲染前 ref 已可写
  // 所以这里我们用一个简单 lazy 模式：在 jsx 里用 IIFE 标记新段，渲染完后立刻更新
  if (segments.length > prevRendered) {
    // 推迟到下一帧再更新，避免 React StrictMode 双调用 effect 导致动画跳过
    renderedCountRef.current = segments.length;
  }

  return (
    <>
      {segments.map((seg, i) => {
        const isNew = i >= prevRendered;
        return (
          <div
            key={i}
            className={[
              "segment",
              isNew ? "segment-fade-in" : "segment-stable",
            ].join(" ")}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {seg}
            </ReactMarkdown>
          </div>
        );
      })}
    </>
  );
}
