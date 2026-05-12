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
  loadMatrixOverview,
  loadQuestionFile,
  loadArsenalAddonQ,
  loadDiagnosisTemplate,
  loadResponseProtocol,
  loadArsenalAddon,
  loadResponseStructure,
  loadV094Persona,
  loadV094Protocol,
} from "./methodology_loader";
import { pickCurrentQ } from "./q_picker";

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
    // v0.7.9.4.1 上调：50% 降维打击需要画面感案例 + 第3轮起术语转译，800 易截断
    maxTokens: 1200,
  },
  rational: {
    id: "rational",
    label: "讲道理",
    subtitle: "我不吵架，我拆结构",
    description: "理性分析，逻辑犀利。适合已经有完整想法、需要被严肃审视的场景。",
    attackIntensity: [0.6, 0.8],
    temperature: 0.5,
    // v0.7.9.4.1 上调：字数下限 350 + 1-3 术语转译 + ABC，1200 易顶到边界
    maxTokens: 1600,
  },
  scathing: {
    id: "scathing",
    label: "扇巴掌",
    subtitle: "别做梦了，醒醒",
    description: "毒舌全开，御姐爆裂。适合你已经自我感动、需要被狠狠打醒的时刻。",
    attackIntensity: [0.9, 1.2],
    temperature: 0.9,
    // v0.7.9.4.1 上调：30/50/20 配比 + 第3轮温柔收尾，900 会被截断导致末段崩塌
    maxTokens: 1500,
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

function loadFinalReminder(mode: ModeId, userTurnCount: number): string {
  // v0.7.9.4.2 翻转铁律覆盖：前 2 轮 scathing/rational 档不强制 ABC
  //
  // 原因：v0.7.9.4 升级节规定"前 2 轮用反问拉用户进数字语境，不抛 ABC"，
  // 但原 final_reminder 一刀切写"末尾必有编号 forced choice"，权重高于升级节，
  // 导致 scathing/rational 第 1 轮仍被压着给 ABC（真机走查验证失守）。
  //
  // casual 档第 1 轮本来就允许给 ABC（casual 升级节 15% ABC 是常规配比），不豁免。
  const isEarlyTurn = userTurnCount <= 2;
  const shouldWaiveABC = isEarlyTurn && (mode === "scathing" || mode === "rational");

  const rule3 = shouldWaiveABC
    ? [
        `3. **前 2 轮翻转铁律（v0.7.9.4 · 当前是第 ${userTurnCount} 轮 · ${mode} 档）**——`,
        "   - ❌ **本轮严禁给 A/B/C 编号选项**（这是 v0.7.9.4 升级节的核心铁律）",
        "   - ❌ 严禁给\"路径建议 / 温柔收尾 / 我给你指两条路\"这种结论式收束",
        "   - ✅ 必须以**反问拉用户进数字 / 事实语境**收尾（\"你这 X 是几年攒的？\"\"你 N 粉里几个留过手机号？\"）",
        "   - ✅ 反问的是**数字 / 事实 / 行动 / 名单**，绝不是\"感受 / 体验 / 情绪\"（后者是顾问引导 · 禁止）",
        "   - ✅ 可以抛 1 个**行业真相数字**作为预防针，但后面必须跟反问",
        "   - 这条铁律优先级 > 70/20/10 结构铁律的 10% ABC 段 · 本轮 10% ABC 段改为\"10% 刀锋追问\"",
      ].join("\n")
    : [
        "3. **末尾必有编号 forced choice**——",
        "   - 格式必须是 `A. xxx` / `B. xxx` / `C. xxx` 带字母编号",
        "   - ❌「说吧，你卡在哪？」这种开放问句不算",
        "   - ❌「要做 X 还是 Y」这种口头二选一也不算——**必须有明显的 A/B/C 视觉编号**",
        "   - 数一数：我末尾有 ≥ 2 个 A/B/C 编号选项吗？没有就加到够",
      ].join("\n");

  return [
    "## ⛔ 最终提醒（回复前自检 · v0.7.9.4.2 升级版 · 轮次感知）",
    "",
    `**当前轮次：第 ${userTurnCount} 轮 · ${mode} 档**`,
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
    shouldWaiveABC
      ? "   - **10% 本轮改为\"刀锋追问\"**（不是 ABC）—— 指向数字 / 事实（见下方铁律 3）"
      : "   - 10% 是 forced choice（2-3 个 A/B/C **编号**选项，让用户必选一个）",
    "   - 不是清单列问题，是自然叙述 diss 为主体",
    "",
    rule3,
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
    shouldWaiveABC
      ? `**⚠️ 当前第 ${userTurnCount} 轮翻转节奏：铁律 3 的\"不给 ABC + 反问拉数字\"优先级最高。如果你仍想给 ABC，整条重写。**`
      : "**⚠️ 如果结构铁律 1-3 任何一条没过，整条重写——这比内容质量更重要。**",
    "**v0.7.8 的护城河是结构（70/20/10 + 3 轮挥完一题），不是单条文案的漂亮。**",
    "",
    "---",
    "",
    "### ⛔⛔⛔ v0.7.9.5 新增 · 输出污染绝对黑名单（最高优先级 · 任何档位任何轮次）",
    "",
    "**以下内容是给你（LLM）看的内部约束词，对用户回复里绝对不能出现任何一个**：",
    "",
    "- 内部档位代号：`scathing 档` / `casual 档` / `rational 档` / `scathing档` / `casual档` / `rational档`",
    "- 内部铁律名：`结构铁律` / `70/20/10` / `70-20-10` / `forced choice 段` / `ABC 段`",
    "- 内部状态词：`核验通过` / `核验通过？` / `重新生成中` / `整条重写` / `当前轮次：第 N 轮`",
    "- 内部章节标识 emoji 当 marker 用：`🟢` / `🟡` / `🔴` / `⚠️` / `🚨` 作为段首/行首标识",
    "  （行文里自然出现的 emoji 不在此限，只禁止当 marker 用）",
    "- DIRECTOR_NOTE / 导演笔记 / 切入点 / 关注重心 等元词汇",
    "",
    "**这些词的作用是后台让你识别角色和约束**，**对外开口的回复就是醒醒此刻直接对人说的话**——",
    "用户不知道也不需要知道这些代号，看到就出戏。",
    "",
    "**自检最后一步**：开口前过一遍我这段开头有没有任何上述黑名单关键词。有 → 删掉重写。",
    "",
    "---",
    "",
    "### 🗡️ v0.7.9.5.3 新增 · 输出仪式三件套（每次回复结尾必备）",
    "",
    "每条回复**必须**遵守以下 3 个输出格式，前端会基于这些格式做特殊渲染——你只需要按格式输出，不需要知道前端怎么处理：",
    "",
    "**1. 重要观点词必须用 `**双星号**` 加粗**",
    "",
    "段落里的核心观点词、关键名词、关键反差词必须用 markdown 加粗：",
    "- ✅ 例：你给的是**工具**，用户要的是**结果**。",
    "- ✅ 例：他不是**没产品**，他是**没生意**。",
    "- ❌ 例：你给的是工具，用户要的是结果。（裸文本无加粗）",
    "",
    "每段至少 2-4 处加粗。**自然、克制**，不要一句话包 5 个加粗。",
    "",
    "**2. 如果给出 ABC 选择题（forced choice），必须每个选项独立一行**",
    "",
    "格式严格遵守：A、B、C 各占一行，前面是字母 + `.` + 空格，**绝不在同一行连写多个选项**。",
    "",
    "✅ 正确格式：",
    "```",
    "A. 做成一个每月收 99 块钱的小工具，靠裂变到几万用户，自己一个人躺着收。",
    "B. 做成一个能跟 Boss直聘谈合作的数据接口，拿 B 端大单子。",
    "C. 我根本没想过 3 年后的事，先赚快钱再说。",
    "```",
    "",
    "❌ 错误格式：",
    "```",
    "A. 做成小工具…… B. 做成数据接口…… C. 我没想过……",
    "```",
    "",
    "**3. 每条回复**必须**以\"醒醒盖章句\"结尾，格式 `[KILL]xxx[/KILL]`**",
    "",
    "在所有内容（包括 ABC 选项）之后，**单独成段**写一条 `[KILL]xxx[/KILL]`。这是这一整段的灵魂总结，是醒醒拍桌子的那句话。",
    "",
    "**KILL 句要求**：",
    "- 字数：15-40 字之间，太短没分量，太长就不是金句",
    "- 内容：是这段最狠的一刀，是这段的灵魂总结，**不是引出新话题**",
    "- 形式：陈述句最佳，不要问句（问句已经在 ABC 里）",
    "- 调性：跟当前档位一致——",
    "  - casual 档：温柔嘲讽（例：`你这执念挺新鲜，但姐听过几百遍。`）",
    "  - rational 档：冷峻诊断（例：`你不是没产品，你是没生意。`）",
    "  - scathing 档：直白扇耳光（例：`你给的是工具，用户要的是结果，这就是所有工具类产品的死穴。`）",
    "",
    "**输出位置**：永远在最后一段，独立成段（前后必须有 `\\n\\n` 空行隔开），不要嵌进段落里。",
    "",
    "**完整回复结构示例**（scathing 档）：",
    "```",
    "（前面 diss 段……）",
    "",
    "（中间 diss 段……带 **加粗观点词**）",
    "",
    "好，那咱不绕了。我就问你一个最关键的——3 年后你这项目长啥样？",
    "",
    "A. 选项一……",
    "B. 选项二……",
    "C. 选项三……",
    "",
    "[KILL]你给的是工具，用户要的是结果，这就是所有工具类产品的死穴。[/KILL]",
    "```",
    "",
    "**铁律**：哪怕你只回一句话，也要在末尾加 `[KILL]xxx[/KILL]`。漏写=违反铁律=重写。",
    "",
    "**⚠️ 标记配对铁律（v0.7.9.5.3.1 强化）**：",
    "- `[KILL]` 和 `[/KILL]` **必须成对出现**，缺任一即视为违反铁律",
    "- ❌ 错误：只写 `xxx[/KILL]`（漏开头标记）",
    "- ❌ 错误：只写 `[KILL]xxx`（漏结尾标记）",
    "- ❌ 错误：把标记拆到不同段落",
    "- ✅ 正确：`[KILL]xxx[/KILL]` 一行内闭合，独立成段",
    "",
    "标记是给前端用的，**用户看到 `[KILL]` 字样会觉得程序坏了**——所以必须严丝合缝地配对。",
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
 * @param userMessage 本轮用户消息（用于 arsenal 命中 + Q picker）
 * @param historySummary 历史摘要（可选，用于 arsenal 更准命中）
 * @param recentHistory v0.7.9 新增：最近的对话历史（用于 Q picker 状态推断）
 *                      传入则启用 12 问动态 picker，否则走 fallback 全量加载（兼容旧调用）
 */
export function buildSystemPrompt(
  mode: ModeId,
  userTurnCount: number,
  userMessage: string,
  historySummary: string = "",
  recentHistory: { role: "user" | "assistant"; content: string }[] = []
): string {
  const parts: string[] = [];

  // 1. Core 铁律（首位高权重 · 永远注入）
  parts.push(loadCore());

  // 2. Persona 骨架（档位人设 · 永远注入）
  parts.push(loadPersona(mode));

  // 3. Dynamic 轮次片段
  parts.push(loadDynamic(userTurnCount));

  // ====================================================================
  // 3.5 v0.7.9.4 升级节 + 横切总则（永远注入 · 第 1 轮起就要在线）
  //
  // 修复 v0.7.9.4 上线后的链路缺失问题：
  //   - 旧版 arsenal_addon/{mode}.md 只在 userTurnCount >= 3 时注入，
  //     而 v0.7.9.4 升级节里的"前 2 轮不抛术语 / 翻转节奏"规则
  //     必须从第 1 轮起就让 LLM 看到，否则关键约束形同虚设。
  //   - 旧版 _response_protocol.md 只在用户说"不知道/没想过"等触发词时注入，
  //     7 条横切总则（姐姐抬杠 / 翻转 ≠ 顾问引导 / 术语转译 / 三红线 等）
  //     大部分对话根本触发不到，必须独立提取为永远注入。
  //
  // 提取策略：从原文件切出特定节区（不复制内容，loader 文件级缓存）。
  // 大小：v094Persona ~1.5K tokens / v094Protocol ~600 tokens，开销可控。
  // ====================================================================
  const v094Persona = loadV094Persona(mode);
  if (v094Persona) parts.push(v094Persona);
  const v094Protocol = loadV094Protocol();
  if (v094Protocol) parts.push(v094Protocol);

  // 4. Arsenal 命中（按场景抽 2 条，无命中就省）
  const arsenalContext = `${userMessage}\n${historySummary}`;
  const arsenal = pickArsenal(arsenalContext, 2);
  if (arsenal) parts.push(arsenal);

  // ====================================================================
  // 4.x v0.7.9 方法论层（动态 12 问 picker · 私藏 symlink）
  //
  // v0.7.9 升级：从全量 matrix 改为「Overview 地图 + 单 Q 详细弹药」动态注入。
  //
  // 注入策略：
  //   - 第 1-2 轮：方法论层全部不注入（开场期，专注首轮黄金公式）
  //   - 第 3+ 轮：picker 决定当前攻哪个 Q + 第几把刀
  //               → 注入 _matrix_overview.md（地图，~600 tokens）
  //               + questions/Qn.md（当前 Q 通用弹药，~400 tokens）
  //               + arsenal_addon/{mode}_q/Qn.md（档位特色加密，~150 tokens）
  //   - 触发"答不出来": 注入 response_protocol（三档差异化 SOP）
  //   - 第 5+ 轮：注入 diagnosis_template（诊断书心法埋点）
  //
  // Token 节省：
  //   - 第 3+ 轮 v0.7.8.2 ~16K → v0.7.9 ~10K（-37%）
  //
  // Fallback 兜底：
  //   - 任何文件缺失全部返回空字符串
  //   - overview/Qn 文件缺失时降级到全量 matrix v1.0（loadMethodology）
  // ====================================================================

  if (userTurnCount >= 3) {
    // 4.1 Q Picker：决定当前要攻哪个 Q + 第几把刀
    const pick = pickCurrentQ(userMessage, recentHistory, userTurnCount, mode);

    // 4.2 矩阵地图（永远注入 + 当前攻击点标注）
    const overview = loadMatrixOverview();
    if (overview) {
      const annotation = `\n\n---\n\n## 🎯 当前攻击点（picker 计算 · 第 ${userTurnCount} 轮）\n\n- **当前主攻 Q**：${pick.primaryQ}\n- **本轮挥第 ${pick.bladeIndex} 把刀**（共 3 把 · ${pick.isSticky ? "粘性中" : "首攻"}）\n- **粘性铁律**：本题 3 把刀挥完才能换题（除非用户明确跳题或答不出来）\n`;
      parts.push(overview + annotation);
    } else {
      // Fallback：overview 缺失 → 退回到全量 matrix（v0.7.8.2 行为）
      const fullMatrix = loadMethodology();
      if (fullMatrix) parts.push(fullMatrix);
    }

    // 4.3 当前 Q 的详细弹药（通用三把刀）
    const qFile = loadQuestionFile(pick.primaryQ);
    if (qFile) parts.push(qFile);

    // 4.4 档位特色加密弹药（在通用基础上加层）
    //
    // v0.7.9.4.1 修复：v0.7.9.4 升级节已通过 loadV094Persona 在 3.5 永远注入，
    // 此处只追加 Q1-Q12 单题加密弹药；缺失时 fallback 到全量 addonFull
    // 也不会与升级节重复（因为升级节是切片不是全量）。
    const addonQ = loadArsenalAddonQ(mode, pick.primaryQ);
    if (addonQ) {
      parts.push(addonQ);
    } else {
      // Fallback：单题加密缺失 → 退回到全量档位 arsenal_addon（v0.7.8.2 行为）
      // 注意：addonFull 包含完整 Q1-Q12 + v0.7.9.4 升级节，
      // 升级节会和 v094Persona 重复一次，但 LLM 对重复约束容忍度高，不影响质量。
      const addonFull = loadArsenalAddon(mode);
      if (addonFull) parts.push(addonFull);
    }
  }

  // 4.5 答不出来 SOP（按 trigger 词命中 · 任何轮次都可触发）
  if (shouldInjectResponseProtocol(userMessage, historySummary)) {
    const responseProtocol = loadResponseProtocol(mode);
    if (responseProtocol) parts.push(responseProtocol);
  }

  // 4.6 诊断书模板（5+ 轮主动给"下次聊建议"时心法埋点）
  if (userTurnCount >= 5) {
    const diagnosis = loadDiagnosisTemplate();
    if (diagnosis) parts.push(diagnosis);
  }

  // 4.7 单轮回复结构铁律（v0.7.8.1 · 70/20/10 · 紧贴 final_reminder · 首尾夹击）
  const responseStructure = loadResponseStructure();
  if (responseStructure) parts.push(responseStructure);

  // 5. 最终提醒（尾位再强化 · 首尾夹击 · v0.7.9.4.2 轮次感知版）
  parts.push(loadFinalReminder(mode, userTurnCount));

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
