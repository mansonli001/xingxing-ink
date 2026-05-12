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
 * v0.7.9.5.3.1 容错升级：
 *   - 标准格式 [KILL]xxx[/KILL] → 直接提取
 *   - LLM 漏前标记：xxx[/KILL] → 兜底匹配（取末段）
 *   - LLM 漏后标记：[KILL]xxx → 兜底匹配（取到段尾）
 *   - 全漏：返回 null（KillStamp 不渲染，回退到普通 markdown）
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
  //    模式：xxx\n\nyyy[/KILL]  → KILL = yyy
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

  return { content: text, kill: null };
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
