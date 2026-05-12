"use client";

/**
 * v0.7.9.5.3 · ABC 选项按钮组件
 *
 * 设计：
 *   - 暗灰底圆角按钮 + hover 主题色 + 自动发送 + 已选灰态显示「已选择：A」
 *   - 移动端文案完整换行不截断
 *
 * 识别策略（在 MessageBubble 调用 extractOptions 之前判定）：
 *   - 仅识别 AI 消息**最后一段文本**（按 \n\n 切段取 last，但 KILL 段已先被剥）
 *   - 段内必须能被正则切出 ≥2 个 A/B/C/D 选项
 *   - 每个选项文本长度 ≥ 8 字符（避免误伤"A. 好 B. 不好"）
 */

import { useState } from "react";
import type { ModeId } from "./modeMeta";

export interface ParsedOption {
  letter: string; // "A" / "B" / "C" / "D"
  text: string;
}

interface OptionButtonsProps {
  options: ParsedOption[];
  mode?: ModeId;
  /** 用户点击某个选项时触发，主程序应当把该 letter 当成用户消息发送出去 */
  onPick?: (letter: string) => void;
  /** 流式中或后续轮已发起 → 禁用全部按钮 */
  disabled?: boolean;
}

/**
 * 从一段文本中提取 ABCD 选项
 *
 * 支持的格式：
 *   - "A. xxx\nB. xxx\nC. xxx" （标准）
 *   - "A、xxx\nB、xxx" （中文顿号）
 *   - "A xxx\nB xxx" （仅大写字母 + 空格 - 罕见）
 *
 * 不支持（拒绝识别）：
 *   - 同一行连写多个 "A. xxx B. xxx"（LLM 已被 prompt 要求换行，命中率会高）
 *   - 中间嵌入大写字母后跟句号的（"3.A.B.C 已被淘汰"）
 *
 * @param paragraph 单段文本
 * @returns 提取到的选项数组（不足 2 个返回空数组 → 视为未命中）
 */
export function extractOptions(paragraph: string): ParsedOption[] {
  if (!paragraph) return [];
  const lines = paragraph.split("\n");

  const options: ParsedOption[] = [];
  let currentLetter: string | null = null;
  let currentText: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // 行首字母 A-D + . 或 、 + 至少 1 个字符
    const m = trimmed.match(/^([A-D])[.．、][\s　]*(.+)$/);
    if (m) {
      // flush 上一个
      if (currentLetter) {
        const t = currentText.join(" ").trim();
        if (t.length >= 8) {
          options.push({ letter: currentLetter, text: t });
        }
      }
      currentLetter = m[1];
      currentText = [m[2]];
    } else if (currentLetter) {
      // 续行：拼到当前选项
      currentText.push(trimmed);
    }
  }
  // flush 最后一个
  if (currentLetter) {
    const t = currentText.join(" ").trim();
    if (t.length >= 8) {
      options.push({ letter: currentLetter, text: t });
    }
  }

  // ≥2 个才算命中
  if (options.length < 2) return [];

  // 选项字母必须按 A/B/C 顺序连续（A→B→C 合法，A→C 不合法）
  for (let i = 0; i < options.length; i++) {
    const expected = String.fromCharCode("A".charCodeAt(0) + i);
    if (options[i].letter !== expected) return [];
  }

  return options;
}

export function OptionButtons({
  options,
  mode = "scathing",
  onPick,
  disabled = false,
}: OptionButtonsProps) {
  const [pickedLetter, setPickedLetter] = useState<string | null>(null);

  function handlePick(letter: string) {
    if (pickedLetter || disabled) return;
    setPickedLetter(letter);
    // 给一点视觉延迟，让用户看到"已选择：X"
    setTimeout(() => {
      onPick?.(letter);
    }, 280);
  }

  return (
    <div className="option-buttons" data-mode={mode}>
      {options.map((opt) => {
        const picked = pickedLetter === opt.letter;
        const others = pickedLetter && !picked;
        return (
          <button
            key={opt.letter}
            type="button"
            className={[
              "option-btn",
              picked ? "option-btn-picked" : "",
            ].join(" ")}
            disabled={disabled || others || pickedLetter !== null}
            onClick={() => handlePick(opt.letter)}
            aria-label={`选项 ${opt.letter}: ${opt.text}`}
          >
            <span className="option-btn-letter">{opt.letter}</span>
            <span className="option-btn-text">
              {picked ? (
                <>
                  <span className="option-btn-meta">已选择：{opt.letter}</span>
                  {opt.text}
                </>
              ) : (
                opt.text
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
