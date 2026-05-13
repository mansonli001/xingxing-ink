"use client";

/**
 * v0.7.9.5.3 · 醒醒盖章句组件（版本 1 · 极简侧边线）
 *
 * 设计：4px 主题色左竖线 + 「醒醒 ·」前缀 + 17px 稍加粗 + 主题色微发光
 * 用途：渲染 LLM 输出末尾 [KILL]xxx[/KILL] 标记的灵魂总结句
 * 调性：克制不抢戏，但让读者合上手机时记住的那句话
 *
 * 三档色由父级 [data-mode] CSS Variable 自动继承，本组件不依赖 mode prop
 */

import type { ModeId } from "./modeMeta";

interface KillStampProps {
  text: string;
  mode?: ModeId;
}

/**
 * 提取 KILL 句的工具函数（导出供 MessageBubble 使用）
 *
 * v0.7.9.5.3.1 三层容错：
 *   - 标准格式 [KILL]xxx[/KILL] → 直接提取
 *   - LLM 漏前标记：xxx[/KILL] → 兜底匹配（取末段）
 *   - LLM 漏后标记：[KILL]xxx → 兜底匹配（取到段尾）
 *
 * v0.7.9.5.5.2 第四层兜底（金句特征识别）：
 *   - 完全无标记时（多轮上下文衰减），按"末段是否符合金句特征"识别
 *   - 金句特征：单段、长度 10-60 字、含至少 1 个金句关键词
 *   - 金句关键词白名单：死穴 / 真相 / 本质 / 你不是X / 不是Y就行 / 你才是 / 这就是 / 你给的是 / 你以为是 / 生意就得 / 账本 / 醒醒
 *   - 不符合 → 返回 null（保险起见，宁可不渲染也别误把普通话当金句）
 *
 * @param text 完整 LLM 输出
 * @returns { content: 剥掉 KILL 段的正文, kill: KILL 句内容（无标记） }
 */
export function extractKillStamp(text: string): {
  content: string;
  kill: string | null;
} {
  if (!text) return { content: text, kill: null };

  // 1. 标准格式：[KILL]xxx[/KILL]
  const standard = text.match(/\[KILL\]([\s\S]*?)\[\/KILL\]/);
  if (standard) {
    const kill = standard[1].trim();
    if (kill) {
      const content = text
        .replace(/\n*\[KILL\][\s\S]*?\[\/KILL\]\n*/, "")
        .trim();
      return { content, kill };
    }
  }

  // 2. LLM 漏 [KILL] 开头但有 [/KILL] 结尾：取末段或结尾标记前一段当 KILL
  const onlyEnd = text.match(/(?:^|\n\n)([^\n]+?)\[\/KILL\]/);
  if (onlyEnd) {
    const kill = onlyEnd[1].trim();
    if (kill && kill.length >= 8 && kill.length <= 80) {
      const content = text
        .replace(/\n*[^\n]*?\[\/KILL\]\n*/, "")
        .trim();
      return { content, kill };
    }
  }

  // 3. LLM 漏 [/KILL] 结尾但有 [KILL] 开头：取标记后所有内容到段尾当 KILL
  const onlyStart = text.match(/\[KILL\]([\s\S]+?)(?:\n\n|$)/);
  if (onlyStart) {
    const kill = onlyStart[1].trim();
    if (kill && kill.length >= 8 && kill.length <= 80) {
      const content = text.replace(/\n*\[KILL\][\s\S]+?(?=\n\n|$)/, "").trim();
      return { content, kill };
    }
  }

  // 4. v0.7.9.5.5.2 · 完全无标记时按金句特征兜底
  const fallback = detectKillByFeature(text);
  if (fallback) {
    const content = text.replace(fallback.raw, "").trim();
    // 多余空行清理
    return { content: content.replace(/\n{3,}/g, "\n\n"), kill: fallback.kill };
  }

  return { content: text, kill: null };
}

/**
 * v0.7.9.5.5.2 · 按金句特征识别（完全无 KILL 标记时的最后兜底）
 *
 * 判定条件（必须全部满足）：
 *   1. 末段（按 \n\n 切的最后一段）
 *   2. 单行（不含换行）
 *   3. 长度 10-60 字
 *   4. 含至少 1 个金句关键词（白名单）
 *   5. 末段不能是 ABC 选项段（含 A. / B. / C. / D. 行首/独立行）
 */
function detectKillByFeature(
  text: string
): { kill: string; raw: string } | null {
  const paragraphs = text.split(/\n\n/).filter((p) => p.trim());
  if (paragraphs.length === 0) return null;
  const lastPara = paragraphs[paragraphs.length - 1].trim();

  // 排除 ABC 段（含明显的 A./B./C./D. 标记）
  if (/(?:^|\s)[A-D][.．、]\s/.test(lastPara)) return null;
  // 排除多行（金句一定是一句话）
  if (lastPara.includes("\n")) return null;
  // 长度 10-60 字
  if (lastPara.length < 10 || lastPara.length > 60) return null;

  // 金句关键词白名单（命中至少 1 个）
  const KILL_KEYWORDS = [
    /死穴/,
    /真相/,
    /本质/,
    /你不是.{1,8}你是/,
    /不是.{1,8}就行/,
    /你才是/,
    /这就是/,
    /你给的是/,
    /你以为是/,
    /生意就得/,
    /账本/,
    /醒醒/,
    /答案/,
    /钱赚不到/,
    /路走错了/,
    /想清楚/,
    /骗自己/,
  ];
  const matched = KILL_KEYWORDS.some((kw) => kw.test(lastPara));
  if (!matched) return null;

  return {
    kill: lastPara,
    // raw 用于从原文中剥掉这段（保留前后空白由调用方处理）
    raw: paragraphs[paragraphs.length - 1],
  };
}

export function KillStamp({ text, mode = "scathing" }: KillStampProps) {
  if (!text) return null;
  return (
    <div className="kill-stamp" data-mode={mode}>
      <span className="kill-stamp-prefix">醒醒 · </span>
      <span className="kill-stamp-text">{text}</span>
    </div>
  );
}
