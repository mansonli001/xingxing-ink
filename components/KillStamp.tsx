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
 * @param text 完整 LLM 输出
 * @returns { content: 剥掉 KILL 段的正文, kill: KILL 句内容（无标记） }
 */
export function extractKillStamp(text: string): {
  content: string;
  kill: string | null;
} {
  if (!text) return { content: text, kill: null };

  // 匹配最后一个 [KILL]xxx[/KILL]（贪婪）
  const match = text.match(/\[KILL\]([\s\S]*?)\[\/KILL\]/);
  if (!match) return { content: text, kill: null };

  const kill = match[1].trim();
  if (!kill) return { content: text, kill: null };

  // 从原文移除 KILL 标记段（包含可能的前后空白行）
  const content = text.replace(/\n*\[KILL\][\s\S]*?\[\/KILL\]\n*/, "").trim();

  return { content, kill };
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
