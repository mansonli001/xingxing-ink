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
import {
  loadMethodology,
  loadDiagnosisTemplate,
  loadResponseProtocol,
  loadArsenalAddon,
  loadResponseStructure,
} from "./methodology_loader";

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
    "## ⛔ 最终提醒（回复前自检 · v0.7.8.1 强化版）",
    "",
    "开口前，心里过一遍这 7 条，任何一条不过关就回炉重改：",
    "",
    "### 🔴 结构铁律（v0.7.8 新增 · 优先级最高）",
    "",
    "1. **本轮只挥 1 把刀**——",
    "   - 我这段里到底问了几个独立问题？**数一数**——超过 1 个就是违反铁律",
    "   - 同一题 3 把刀（BMC/PRD/JTBD 等方法论视角）必须**分 3 轮挥完**，不是一轮堆 3 把",
    "   - ❌ 严禁\"我光用三个问题\"/\"我问你三件事\"/\"第一个问题... 第二个问题...\"这种自爆节奏",
    "   - ✅ 正确姿势：先大段 diss（60-70%）铺 1 个锚点，最后 1 个追问（20%）只问 1 把刀",
    "",
    "2. **70/20/10 篇幅铁律**——",
    "   - 70% 是大段 diss（戳穿 / 举反例 / 现实碾压 / 带真实竞品名和数字）",
    "   - 20% 是追问（**只问 1 把刀**，措辞毒蛇人话）",
    "   - 10% 是 forced choice（2-3 个 A/B/C **编号**选项，让用户必选一个）",
    "   - 不是清单列问题，是自然叙述 diss 为主体",
    "",
    "3. **末尾必有编号 forced choice**——",
    "   - 格式必须是 `A. xxx` / `B. xxx` / `C. xxx` 带字母编号",
    "   - ❌「说吧，你卡在哪？」这种开放问句不算",
    "   - ❌「要做 X 还是 Y」这种口头二选一也不算——**必须有明显的 A/B/C 视觉编号**",
    "   - 数一数：我末尾有 ≥ 2 个 A/B/C 编号选项吗？没有就加到够",
    "",
    "### 🟡 内容铁律（v0.7.7 沿用）",
    "",
    "4. **我输出的只是醒醒说出口的话**——",
    "   - 没有元说明、没有模式名、没有方括号 [XXX]",
    "   - **没有舞台指示 / 动作旁白**（`（笑了一声）` / `（翻白眼）` / `（敲桌子）` 这种圆括号旁白也禁止）",
    "   - 情绪通过**词汇和语气**传达，不靠动作描写",
    "5. **我没有丢产品锚点**——用户上一句如果是短答词，我把它当回答；历史有 idea 锚点我就死咬 idea",
    "6. **我没有幻觉用户没说过的具体形态/背景/身份**——",
    "   - 用户说「陪伴类 AI」不会被我说成「帮大学生找对象的 App」",
    "   - 用户没说自己做过 SaaS，我不会说「你终于从冷冰冰的 SaaS 里走出来」",
    "   - 用户没说心情、没说职业、没说处境——我一律**不假设**，想知道就**问**",
    "7. **我跟着用户当前这句话走**——不按维度顺序流水线追问",
    "",
    "---",
    "",
    "**⚠️ 如果结构铁律 1-3 任何一条没过，整条重写——这比内容质量更重要。**",
    "**v0.7.8 的护城河是结构（70/20/10 + 3 轮挥完一题），不是单条文案的漂亮。**",
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

  // 1. Core 铁律（首位高权重 · 永远注入）
  parts.push(loadCore());

  // 2. Persona 骨架（档位人设 · 永远注入）
  parts.push(loadPersona(mode));

  // 3. Dynamic 轮次片段
  parts.push(loadDynamic(userTurnCount));

  // 4. Arsenal 命中（按场景抽 2 条，无命中就省）
  const arsenalContext = `${userMessage}\n${historySummary}`;
  const arsenal = pickArsenal(arsenalContext, 2);
  if (arsenal) parts.push(arsenal);

  // ====================================================================
  // 4.x v0.7.8 方法论层（按需注入 · 私藏 symlink）
  //
  // 设计原则：避免 25K+ token 的 prompt 衰减 LLM 注意力。
  // 不同轮次注入不同层，让 prompt 长度随对话深度递进。
  //
  // 注入策略：
  //   - 第 1-2 轮：方法论层全部不注入（开场期，专注首轮黄金公式）
  //   - 第 3+ 轮：注入 matrix（核心心法）+ arsenal_addon（三档主攻区弹药）
  //   - 触发"答不出来": 注入 response_protocol（三档差异化 SOP）
  //   - 第 5+ 轮：注入 diagnosis_template（诊断书心法埋点）
  //
  // 这样：
  //   - 第 1-2 轮 prompt ~12K chars（同 v0.7.7）
  //   - 第 3-5 轮 prompt ~25K chars（按需）
  //   - 第 6+ 轮 prompt ~28K chars（含诊断书）
  //   - 缺失文件全部返回空字符串保底，主流程可工作（弱化为 v0.7.7）
  // ====================================================================

  if (userTurnCount >= 3) {
    // 4.1 五维矩阵（核心心法 · 第 3+ 轮才注入）
    const methodology = loadMethodology();
    if (methodology) parts.push(methodology);

    // 4.3 三档主攻区弹药（按档抽 · 第 3+ 轮才注入）
    const arsenalAddon = loadArsenalAddon(mode);
    if (arsenalAddon) parts.push(arsenalAddon);
  }

  // 4.2 答不出来 SOP（按 trigger 词命中 · 任何轮次都可触发）
  if (shouldInjectResponseProtocol(userMessage, historySummary)) {
    const responseProtocol = loadResponseProtocol(mode);
    if (responseProtocol) parts.push(responseProtocol);
  }

  // 4.4 诊断书模板（5+ 轮主动给"下次聊建议"时心法埋点）
  if (userTurnCount >= 5) {
    const diagnosis = loadDiagnosisTemplate();
    if (diagnosis) parts.push(diagnosis);
  }

  // 4.5 单轮回复结构铁律（v0.7.8.1 · 70/20/10 · 后移紧贴 final_reminder）
  //     关键优化：从 3.5 位后移到这里，紧贴 final_reminder 压轴强化结构权重。
  //     LLM 注意力在结尾最强，把结构铁律放末尾才不会被"内容性指令"（弹药话术）盖过。
  //     这条永远注入 ~3K chars，性能影响可忽略。
  const responseStructure = loadResponseStructure();
  if (responseStructure) parts.push(responseStructure);

  // 5. 最终提醒（尾位再强化 · 首尾夹击 · v0.7.8.1 加强版结构铁律）
  parts.push(loadFinalReminder());

  return parts.join("\n\n---\n\n");
}

/**
 * 检测用户消息是否包含"答不出来"信号——决定要不要注入 response_protocol。
 *
 * 命中策略：单纯 includes 子串匹配（与 arsenal_picker 同构）。
 * 任何一轮的当前消息或最近历史里出现 trigger 词，就注入。
 *
 * 这样做避免每轮都注入 5K chars 的 SOP（90% 的对话用户都在好好答）。
 */
function shouldInjectResponseProtocol(
  userMessage: string,
  historySummary: string
): boolean {
  const text = `${userMessage}\n${historySummary}`;
  // 答不出来 / 模糊 / 答非所问 三类 trigger
  const triggers = [
    "不知道",
    "没想过",
    "没考虑过",
    "不太清楚",
    "我也不确定",
    "我不太确定",
    "不太懂",
    "想不出来",
    "暂时没",
    "还没想",
    "大概",
    "应该是",
    "差不多",
    "我猜",
    "可能吧",
    "估计",
    "好像",
    "也许",
  ];
  return triggers.some((kw) => text.includes(kw));
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
