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
 * v0.7.9.5.5.2 升级：双策略容错（先按行扫，失败则按"全段同行连写"切分）
 *
 * 策略 1（标准）· 按行扫描：
 *   - "A. xxx\nB. xxx\nC. xxx" （标准换行格式）
 *   - "A、xxx\nB、xxx" （中文顿号）
 *
 * 策略 2（兜底 v0.7.9.5.5.2）· 同行连写正则切：
 *   - "A. xxx B. xxx C. xxx D. xxx"（LLM 多轮上下文衰减把 ABCD 挤回同一段）
 *   - 用 lookahead 边界 (?=\s+[A-D][.．、]|$) 切分
 *
 * 支持范围：
 *   - 选项字母 A-D（v0.7.9.5.5.2 新增 D 选项支持）
 *   - 必须按 A→B→C(→D) 顺序连续
 *   - 每个选项文本 ≥ 8 字符
 *   - ≥2 个才算命中
 *
 * @param paragraph 单段文本
 * @returns 提取到的选项数组（不足 2 个返回空数组 → 视为未命中）
 */
export function extractOptions(paragraph: string): ParsedOption[] {
  if (!paragraph) return [];

  // ===== 策略 1：按行扫描（标准格式）=====
  const lines = paragraph.split("\n");
  const lineOptions: ParsedOption[] = [];
  let currentLetter: string | null = null;
  let currentText: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // 行首字母 A-D + . 或 、 + 至少 1 个字符
    const m = trimmed.match(/^([A-D])[.．、][\s　]*(.+)$/);
    if (m) {
      if (currentLetter) {
        const t = currentText.join(" ").trim();
        if (t.length >= 8) {
          lineOptions.push({ letter: currentLetter, text: t });
        }
      }
      currentLetter = m[1];
      currentText = [m[2]];
    } else if (currentLetter) {
      currentText.push(trimmed);
    }
  }
  if (currentLetter) {
    const t = currentText.join(" ").trim();
    if (t.length >= 8) {
      lineOptions.push({ letter: currentLetter, text: t });
    }
  }

  // 策略 1 命中 ≥2 且字母连续 → 返回
  const validated1 = validateContinuous(lineOptions);
  if (validated1.length >= 2) return validated1;

  // ===== 策略 2（v0.7.9.5.5.2 兜底）：同行连写正则切 =====
  // 把整段文本当成一行处理，用 lookahead 在每个 "[空白+A-D+.／、]" 前断开
  // 例：" A. 卖会员……比如19.9一个月。 B. 卖广告/带货……佣金。 C. 卖课程……陪伴。 D. 我还没想清楚……"
  const flatText = paragraph.replace(/\s+/g, " ").trim();
  // 必须有 ≥2 个 ABCD 标记才进入策略 2（避免误伤普通段落里偶现的 "A."）
  const markerCount = (flatText.match(/(?:^|\s)([A-D])[.．、]\s+/g) || []).length;
  if (markerCount < 2) return [];

  // 切分点：每个 (^|空白)[A-D][.／、] 前
  // 用全局正则配合 split + map
  const segOptions: ParsedOption[] = [];
  // 在每个标记前插入分隔符 \u0001，再 split
  const marked = flatText.replace(
    /(^|\s)([A-D])[.．、]\s*/g,
    "\u0001$2|"
  );
  const chunks = marked.split("\u0001").filter(Boolean);
  for (const chunk of chunks) {
    const m = chunk.match(/^([A-D])\|(.+)$/);
    if (!m) continue;
    const letter = m[1];
    let text = m[2].trim();
    // 截掉末尾可能带过来的下一段废话（比如 KILL 段已经在 MessageBubble 剥过，这里不再处理）
    if (text.length >= 8) {
      segOptions.push({ letter, text });
    }
  }

  return validateContinuous(segOptions);
}

/**
 * 校验选项字母按 A→B→C(→D) 顺序连续
 * 不连续返回空数组，连续返回原数组
 */
function validateContinuous(options: ParsedOption[]): ParsedOption[] {
  if (options.length < 2) return [];
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
