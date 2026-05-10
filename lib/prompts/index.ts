/**
 * Prompt 组装引擎（v0.7.4 重构）
 *
 * 架构：分层动态组装
 *   - core/        5 条硬铁律（永在，首尾双保险）
 *   - persona/     三档人格骨架（砍薄版，各 ~150 行）
 *   - dynamic/     按轮次注入（turn_1_2 / turn_3_5 / turn_6_plus）
 *   - _arsenal.md  按关键词命中抽 2-3 条（不再全文 prepend）
 *
 * 对比 v0.7.3：
 *   - system prompt 总长从 ~700 行 → ~350 行（砍 50%）
 *   - 每轮注入内容不一样 → 反套路化天然内建
 *   - 核心铁律首尾夹击对抗 LLM 注意力衰减
 */

import fs from "node:fs";
import path from "node:path";
import { pickArsenal } from "./arsenal_picker";

export type ModeId = "casual" | "rational" | "scathing";

export interface WakeMode {
  id: ModeId;
  label: string;
  subtitle: string;
  description: string;
  attackIntensity: [number, number];
  temperature: number;
  maxTokens: number;
}

export const MODES: Record<ModeId, WakeMode> = {
  casual: {
    id: "casual",
    label: "随便聊",
    subtitle: "姐不陪你做梦，但也不骂你",
    description: "温和直率，留情面不留幻觉。适合想法还没成型、需要有人帮你捋一捋的时刻。",
    attackIntensity: [0.3, 0.5],
    temperature: 0.8,
    maxTokens: 800,
  },
  rational: {
    id: "rational",
    label: "讲道理",
    subtitle: "我不吵架，我拆结构",
    description: "理性分析，逻辑犀利。适合已经有完整想法、需要被严肃审视的场景。",
    attackIntensity: [0.6, 0.8],
    temperature: 0.5,
    maxTokens: 1200,
  },
  scathing: {
    id: "scathing",
    label: "扇巴掌",
    subtitle: "别做梦了，醒醒",
    description: "毒舌全开，御姐爆裂。适合你已经自我感动、需要被狠狠打醒的时刻。",
    attackIntensity: [0.9, 1.2],
    temperature: 0.9,
    maxTokens: 900,
  },
};

const IS_DEV = process.env.NODE_ENV !== "production";

// ========================================================================
// 文件读取 + 缓存
// ========================================================================

const fileCache: Record<string, string> = {};

function loadFile(relPath: string): string {
  if (!IS_DEV && fileCache[relPath]) return fileCache[relPath];

  const fullPath = path.join(process.cwd(), "lib", "prompts", relPath);
  try {
    const content = fs.readFileSync(fullPath, "utf-8");
    if (!IS_DEV) fileCache[relPath] = content;
    return content;
  } catch {
    // 缺失不阻断主流程：返回空字符串
    if (!IS_DEV) fileCache[relPath] = "";
    return "";
  }
}

// ========================================================================
// 分层加载器
// ========================================================================

function loadCore(): string {
  const files = [
    "core/00_output_rules.md",
    "core/01_product_anchor.md",
    "core/02_no_hallucination.md",
    "core/03_idea_first.md",
    "core/04_forced_choice.md",
  ];
  return files.map((f) => loadFile(f)).filter(Boolean).join("\n\n---\n\n");
}

function loadPersona(mode: ModeId): string {
  return loadFile(`persona/${mode}_core.md`);
}

/**
 * 根据轮次选择 dynamic 片段
 *
 * @param userTurnCount 用户消息轮次（= Math.floor(history.length / 2) + 1，因为本轮 user 消息还没写入 history）
 */
function loadDynamic(userTurnCount: number): string {
  if (userTurnCount <= 2) return loadFile("dynamic/turn_1_2.md");
  if (userTurnCount <= 5) return loadFile("dynamic/turn_3_5.md");
  return loadFile("dynamic/turn_6_plus.md");
}

function loadFinalReminder(): string {
  return [
    "## ⛔ 最终提醒（回复前自检）",
    "",
    "开口前，心里过一遍：",
    "",
    "1. **我输出的只是醒醒说出口的话**——",
    "   - 没有元说明、没有模式名、没有方括号 [XXX]",
    "   - **没有舞台指示 / 动作旁白**（`（笑了一声）` / `（翻白眼）` / `（敲桌子）` 这种圆括号旁白也禁止）",
    "   - 情绪通过**词汇和语气**传达，不靠动作描写",
    "2. **我没有丢产品锚点**——用户上一句如果是短答词，我把它当回答；历史有 idea 锚点我就死咬 idea",
    "3. **我没有幻觉用户没说过的具体形态/背景/身份**——",
    "   - 用户说「陪伴类 AI」不会被我说成「帮大学生找对象的 App」",
    "   - 用户没说自己做过 SaaS，我不会说「你终于从冷冰冰的 SaaS 里走出来」",
    "   - 用户没说心情、没说职业、没说处境——我一律**不假设**，想知道就**问**",
    "4. **我至少给了 2 个带选项的 forced choice**——不说「你有没有想过」这种开放废问",
    "   - 数一数：我这段末尾有 ≥ 2 个带选项的反问吗？没有就加到够",
    "5. **我跟着用户当前这句话走**——不按维度顺序流水线追问",
  ].join("\n");
}

// ========================================================================
// 主接口：组装完整 system prompt
// ========================================================================

/**
 * 构建一条完整的 system prompt
 *
 * @param mode 三档之一
 * @param userTurnCount 当前是用户第几轮发言（1 起）
 * @param userMessage 本轮用户消息（用于 arsenal 命中）
 * @param historySummary 历史摘要（可选，用于 arsenal 更准命中）
 */
export function buildSystemPrompt(
  mode: ModeId,
  userTurnCount: number,
  userMessage: string,
  historySummary: string = ""
): string {
  const parts: string[] = [];

  // 1. Core 铁律（首位高权重）
  parts.push(loadCore());

  // 2. Persona 骨架（档位人设）
  parts.push(loadPersona(mode));

  // 3. Dynamic 轮次片段
  parts.push(loadDynamic(userTurnCount));

  // 4. Arsenal 命中（按场景抽 2 条，无命中就省）
  const arsenalContext = `${userMessage}\n${historySummary}`;
  const arsenal = pickArsenal(arsenalContext, 2);
  if (arsenal) parts.push(arsenal);

  // 5. 最终提醒（尾位再强化，首尾夹击）
  parts.push(loadFinalReminder());

  return parts.join("\n\n---\n\n");
}

/**
 * 兼容旧接口（仅用于紧急回滚）
 *
 * @deprecated v0.7.4 起应使用 buildSystemPrompt
 */
export function loadSystemPrompt(mode: ModeId): string {
  // 回滚到 0 轮 + 空消息的组装
  return buildSystemPrompt(mode, 1, "");
}

export function getMode(id: string): WakeMode {
  if (id in MODES) return MODES[id as ModeId];
  return MODES.scathing;
}
