/**
 * 醒醒 · Q 账本轻量判官（v0.7.12.0 新增）
 *
 * 职责：在主流式回复完成后被 fire-and-forget 调用一次。
 *   输入：最近 3 轮对话 + 当前 ledger 摘要 + 档位
 *   输出：本轮挥到了 Q几第几刀（增量 +1/+2）+ 用户原话证据
 *
 * 设计约束：
 *   - prompt < 1500 token（仅最近 3 轮 + ledger 摘要 + 12 问精简版）
 *   - temperature = 0.2（求稳不求野，账本不需要个性）
 *   - max_tokens = 300（增量很小）
 *   - response_format = json_object（强制结构化）
 *   - 失败抛异常由调用方 console.warn 静默吞（不阻塞主对话）
 *
 * 安全护栏：
 *   - 用户消息已通过 hasUserFact 预筛 —— prompt 里明确告知判官，
 *     用户没说出"事实"（数字/具体场景/专有名词）的题不应升级 blades
 *   - userQuote 必须来自最近 3 轮 user 消息（不许编造）
 */

import type { ChatMessage } from "@/lib/deepseek";
import type { ModeId } from "@/lib/prompts";
import type { QLedger, LedgerIncrement } from "./types";
import { Q_NAMES } from "./types";

const DEEPSEEK_BASE_URL =
  process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
const MODEL = process.env.DEEPSEEK_LEDGER_MODEL || "deepseek-chat";

// =========================================================================
// SYSTEM PROMPT （精简版 12 问 · 不重复 generator.ts 的全文）
// =========================================================================

const SYSTEM_PROMPT = `你是「醒醒」对话的书记官。
你的唯一任务：根据最近 3 轮对话与当前账本，判断这一轮挥到了哪几个 Q 题的第几刀，并给出用户原话证据。

# 12 问速查
Q1 为谁做 / Q2 真痛 / Q3 凭什么是你 / Q4 怎么找到你 / Q5 为什么留下 / Q6 怎么收钱
Q7 成本结构 / Q8 靠谁兜底 / Q9 MVP 长什么样 / Q10 怎么用 / Q11 数据飞轮 / Q12 你这人靠不靠谱

# 「3 把刀」打分铁律
- 0 刀 = 完全没聊到
- 1 刀 = 用户提到过但没说透
- 2 刀 = 用户给出场景/方向但缺数字/名字
- 3 刀 = 用户给出可验证答案（含数字/具体名字/可操作动作）

# 重要约束（绝不违反）
1. **bladesIncrement 是增量（+1 或 +2）**——不是绝对值，不能给已经 3 刀的题再加分
2. **只有用户消息真带"事实"才能升级 blades**——判断标准：含数字 / 含专有名词 / 含具体动词。
   纯回复 A/B/C 或"嗯/不知道/没想过/试试看" → bladesIncrement = 0（即不要返回该题更新）
3. **userQuote 必须从最近 3 轮 user 消息原话摘录**——不许重写、不许编造、不许超过 80 字
4. **同一轮最多更新 2 个 Q**——醒醒一刀挥一题，不会一轮砍 5 题
5. **保守原则**：判断不准时宁可不更新，也不许虚高
6. **JSON 严格模式**：直接返回 JSON 对象，不要 markdown 包裹、不要解释

# 输出 schema
{
  "updates": [
    { "questionId": 4, "bladesIncrement": 1, "userQuote": "我打算先在小红书发笔记冷启动" }
  ]
}

如果本轮没有任何题应该升级 blades，返回 { "updates": [] }`;

// =========================================================================
// 调用入口
// =========================================================================

export interface JudgeOptions {
  recentMessages: Array<{ role: "user" | "assistant"; content: string }>;
  currentLedger: QLedger;
  mode: ModeId;
  signal?: AbortSignal;
}

/**
 * 判定本轮挥刀增量。失败抛异常由调用方静默处理。
 */
export async function judgeRoundIncrement(
  opts: JudgeOptions
): Promise<LedgerIncrement> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY 未配置");
  }

  const { recentMessages, currentLedger, mode } = opts;

  // 仅取最近 3 轮（user+assistant 对，最多 6 条消息）
  const tail = recentMessages.slice(-6);
  const recentText = tail
    .map((m) => `【${m.role === "user" ? "用户" : "醒醒"}】${m.content}`)
    .join("\n");

  // ledger 摘要（不输出 entries 详情，仅出题号分类）
  const ledgerSummary = [
    `已聊透：${currentLedger.fullyCovered.join(",") || "（无）"}`,
    `半聊到：${currentLedger.halfCovered
      .map((q) => `Q${q}(${currentLedger.entries[q].blades}/3)`)
      .join(",") || "（无）"}`,
    `没聊：${currentLedger.notCovered.join(",")}`,
  ].join(" · ");

  const userPrompt = `# 档位
${mode}

# 当前账本摘要
${ledgerSummary}

# 最近对话（仅用于判定本轮挥刀，userQuote 必须来自这里）
${recentText}

# 任务
判断本轮（最后一对用户↔醒醒）挥到了哪几题的第几刀。
铁律：保守 · 用户消息无"事实"则不升级 · userQuote 必须原话摘录 · 同轮最多更新 2 题。
返回 JSON。`;

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.2,
      max_tokens: 300,
      stream: false,
      response_format: { type: "json_object" },
    }),
    signal: opts.signal,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(
      `DeepSeek 判官 API 错误 ${response.status}: ${errText.slice(0, 200)}`
    );
  }

  const data = await response.json();
  const content: string | undefined =
    data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("DeepSeek 判官返回空内容");
  }

  // 解析（容错 ``` 包裹）
  let cleaned = content.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`判官 JSON 解析失败：${(err as Error).message}`);
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !Array.isArray((parsed as { updates?: unknown }).updates)
  ) {
    throw new Error("判官返回 schema 不合法（缺 updates 数组）");
  }

  // 验证每条 update（防 LLM 字段缺失）
  const safeUpdates = (parsed as LedgerIncrement).updates.filter((u) => {
    return (
      typeof u.questionId === "number" &&
      u.questionId >= 1 &&
      u.questionId <= 12 &&
      typeof u.bladesIncrement === "number" &&
      u.bladesIncrement > 0 &&
      u.bladesIncrement <= 2 &&
      typeof u.userQuote === "string" &&
      u.userQuote.trim().length > 0
    );
  });

  return { updates: safeUpdates };
}

// 不直接 export Q_NAMES（仅供 prompt 拼接参考，未来扩展使用）
void Q_NAMES;
