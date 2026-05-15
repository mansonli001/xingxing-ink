/**
 * 诊断书生成器 · v0.7.11
 *
 * 输入：对话历史 + mode + sessionId + qProgress
 * 输出：DiagnosisReport（严格按 types.ts schema）
 *
 * 流程：
 *   1. 拼装 system prompt（嵌入 12 问框架 + 三档措辞 + JSON 输出约束）
 *   2. 把对话历史压缩成给 LLM 看的版本（去掉 __FOLLOWUP__ 内部标记等）
 *   3. 调 DeepSeek 非流式 API · 强制 JSON 模式
 *   4. 解析 + 校验 JSON · 失败则重试 1 次
 *   5. 补全 metadata（id/sessionId/createdAt/mode/turns/qProgress）→ 返回完整 DiagnosisReport
 *
 * 注：本文件不直接访问 KV，调用方负责持久化（解耦关注点）
 */

import type { ChatMessage } from "@/lib/deepseek";
import type { ModeId } from "@/lib/prompts";
import type { DiagnosisReport } from "./types";

const DEEPSEEK_BASE_URL =
  process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
const MODEL = process.env.DEEPSEEK_DIAGNOSIS_MODEL || "deepseek-chat";

// =========================================================================
// SYSTEM PROMPT（核心 IP · 决定诊断书质量）
// =========================================================================

const SYSTEM_PROMPT = `你是「醒醒」——一位专怼"做梦"的产品教练御姐。
你的任务：根据用户和「醒醒」的完整对话，输出一份**结构化的诊断书 JSON**。

# 12 问框架（必须严格按编号填写）

## PART 1 · 商业逻辑层（Q1-Q8）
- Q1 为谁做：目标用户是谁，足够具体（年龄/职业/场景），不能是"年轻人"这种水货
- Q2 解决什么真痛：是真痛还是伪需求，能否用"用户原话"复述痛点
- Q3 凭什么是你：壁垒/独特资源/创始人为什么是这件事的合适人
- Q4 用户怎么找到你：获客渠道（自然流量/付费/PR）、CAC 估算
- Q5 用户为什么留下：留存设计、复访动机、习惯养成钩子
- Q6 怎么收钱：定价策略、付费模型、ARPU 估算
- Q7 成本结构：算力/人力/获客成本、单位经济模型 LTV/CAC
- Q8 靠谁兜底：上游依赖、关键合作方、单点故障风险

## PART 2 · 产品落地层（Q9-Q11）
- Q9 MVP 长什么样：能否在 4 周内做出 minimal viable，砍到一个核心动作
- Q10 用户怎么用：核心使用路径、第一次打开看到什么、5 分钟内完成什么
- Q11 数据飞轮：什么数据会自我增强，飞轮的 N+1 步是什么

## PART 3 · 创始人体检层（Q12）
- Q12 你这人靠不靠谱：精力分配、家庭支持、之前类似项目的烂尾率、烧钱阈值

# 评估每题的「3 把刀」

每题评估必须用 0-3 把刀打分：
- 0 刀 = 完全没聊到（notCovered）
- 1-2 刀 = 聊到了但没说透（halfCovered）
- 3 刀 = 用户给出了具体可验证的答案（fullyCovered）

「刀」的种类（按题目灵活选用）：
- BMC 商业模式画布刀（客户细分/价值主张/收入流等）
- JTBD 雇佣任务刀（用户在什么场景雇佣你的产品）
- PRD 产品需求刀（具体功能、用户故事、验收标准）
- 数据验证刀（是否有数字支撑：调研 N 个、付费意愿 N%、CAC ¥N）
- 心理真壁垒刀（精神层面的差异化，不是口号）

# 档位措辞（影响 verdict.summary 和 killQuote 的语气）

档位 = scathing（扇巴掌）：毒舌全开御姐爆裂。冷笑 + 反讽。
  示例："你聊了 7 轮还没把 Q1 说清楚——你不是在做产品，你在用产品逃。"
  示例 killQuote："这事八字没一撇，你倒是先给自己讲了一晚上故事。"

档位 = rational（讲道理）：理性犀利但不毒舌。逻辑外显。
  示例："Q1-Q3 立得住，Q6 模糊，Q7 完全没碰——商业模型有半张图。"
  示例 killQuote："产品想清楚了，钱怎么来还差三个数。"

档位 = casual（随便聊）：温和直率，留情面但不留幻觉。
  示例："想法挺有意思，但 Q9-Q11 完全空白——你是想做产品还是想讲一个故事？"
  示例 killQuote："想法可以，但还没有一只脚踩进真实世界。"

# 最后裁决书 verdict.diagnosis 三选一

- "完善"：12 问命中 ≥ 9 且核心 Q1-Q6 全部 ≥ 2 刀 → 该往下走了
- "聚焦"：12 问命中 4-8 → 还差关键几题，下次专攻
- "暂时存档"：12 问命中 < 4 或 Q1/Q12 完全没聊 → 想清楚再来

# 输出格式（严格 JSON · 不要 markdown 代码块）

直接返回符合以下 schema 的 JSON 对象，不要任何其他文字：

\`\`\`typescript
{
  "progress": {
    "fullyCovered": [{ "questionId": 1-12, "questionName": "...", "userQuote": "用户原话简引", "evaluation": "醒醒评估（含哪一刀挥到了）", "bladesHit": 3 }],
    "halfCovered":  [{ "questionId": ..., "questionName": "...", "userQuote": "...", "evaluation": "...（哪一刀没接住）", "bladesHit": 1 或 2 }],
    "notCovered":   [题号数组，如 [4, 7, 11]]
  },
  "parts": {
    "business": { "title": "PART 1 · 商业逻辑层", "range": "Q1-Q8", "fullyCovered": [...], "halfCovered": [...], "notCovered": [...], "intro": "可选开场白" },
    "product":  { "title": "PART 2 · 产品落地层", "range": "Q9-Q11", ... },
    "founder":  { "title": "PART 3 · 创始人体检层", "range": "Q12", ... }
  },
  "verdict": {
    "summary": "综合判断 100-200 字，按档位差异化措辞",
    "diagnosis": "完善" | "聚焦" | "暂时存档",
    "homework": ["作业1（含具体数字/名字/动作）", "作业2", "作业3"]
  },
  "nextSession": {
    "primaryQs": [下次主攻的 1-2 个题号],
    "blades": ["建议用的方法论刀1", "刀2"],
    "targetProgress": 下次目标命中数（M+3）
  },
  "killQuote": "末尾金句卡 · 一句话点穴 · 按档位风格"
}
\`\`\`

# 关键约束
1. **不要编造用户没说过的内容**——userQuote 必须是用户对话里出现过的话或意思
2. **每题 evaluation 必须点出"哪把刀挥到了/没接住"**——不能水
3. **homework 必须可执行**——含具体数字/名字/动作（"写出 3 个真实用户的姓名"而不是"了解用户"）
4. **JSON 必须可解析**——不要加注释、不要加 \`\`\` 包裹、不要解释
5. **fullyCovered + halfCovered 加起来不超过 12 题**——同一题不能同时出现在两组
6. **每个 part 的 fullyCovered/halfCovered/notCovered 必须只包含该层级的题号**（business=Q1-8, product=Q9-11, founder=Q12）`;

// =========================================================================
// 对话历史压缩
// =========================================================================

/**
 * 把 chat 内部的对话历史转换成给 LLM 看的纯净版
 * - 过滤 __FOLLOWUP__ 标记（只保留自然话术部分）
 * - 截断到最近 N 轮（避免 token 爆炸）
 */
export function compactConversation(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  maxTurns = 30
): string {
  const recent = messages.slice(-maxTurns * 2);
  return recent
    .map((m) => {
      let content = m.content;
      // 去掉 __FOLLOWUP__|anchor|natural 内部标记，只保留自然话术
      if (content.startsWith("__FOLLOWUP__|")) {
        const parts = content.split("|");
        content = parts[2] || content;
      }
      const speaker = m.role === "user" ? "用户" : "醒醒";
      return `【${speaker}】${content}`;
    })
    .join("\n\n");
}

// =========================================================================
// LLM 非流式调用（带 JSON 模式）
// =========================================================================

interface CallLLMOptions {
  conversation: string;
  mode: ModeId;
  signal?: AbortSignal;
}

async function callLLMForJson({
  conversation,
  mode,
  signal,
}: CallLLMOptions): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY 未配置");
  }

  const userPrompt = `# 用户档位
${mode}

# 完整对话历史（按时间顺序）
${conversation}

# 任务
基于上述对话，按系统提示中的 12 问框架，输出诊断书 JSON。`;

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
      temperature: 0.6,
      max_tokens: 3500,
      stream: false,
      response_format: { type: "json_object" }, // DeepSeek 支持 OpenAI 兼容的 JSON 模式
    }),
    signal,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(
      `DeepSeek API 错误 ${response.status}: ${errText.slice(0, 200)}`
    );
  }

  const data = await response.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("DeepSeek 返回空内容");
  }
  return content;
}

// =========================================================================
// JSON 解析 + 校验
// =========================================================================

interface ParsedDiagnosis {
  progress: DiagnosisReport["progress"];
  parts: DiagnosisReport["parts"];
  verdict: DiagnosisReport["verdict"];
  nextSession: DiagnosisReport["nextSession"];
  killQuote: string;
}

function parseAndValidate(raw: string): ParsedDiagnosis {
  // 容错：去掉可能存在的 ``` 包裹
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`JSON 解析失败：${(err as Error).message}`);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("LLM 返回的不是对象");
  }

  const obj = parsed as Record<string, unknown>;

  // 必填字段校验
  const required = ["progress", "parts", "verdict", "nextSession", "killQuote"];
  for (const field of required) {
    if (!(field in obj)) {
      throw new Error(`缺失必填字段：${field}`);
    }
  }

  // 进一步校验 verdict.diagnosis 必须是三选一
  const verdict = obj.verdict as { diagnosis?: string } | undefined;
  if (
    !verdict ||
    !["完善", "聚焦", "暂时存档"].includes(verdict.diagnosis ?? "")
  ) {
    throw new Error(`verdict.diagnosis 取值非法：${verdict?.diagnosis}`);
  }

  return obj as unknown as ParsedDiagnosis;
}

// =========================================================================
// 顶层入口
// =========================================================================

export interface GenerateOptions {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  mode: ModeId;
  sessionId: string;
  turnCount: number;
  qProgress?: number; // chat 流里已统计的命中数（可选，作 metadata）
  reportId: string; // 由调用方生成，便于路由跳转
  signal?: AbortSignal;
}

/**
 * 生成完整诊断书 · 含 1 次重试
 */
export async function generateDiagnosisReport(
  opts: GenerateOptions
): Promise<DiagnosisReport> {
  const conversation = compactConversation(opts.messages);

  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const raw = await callLLMForJson({
        conversation,
        mode: opts.mode,
        signal: opts.signal,
      });
      const parsed = parseAndValidate(raw);

      // 拼装完整 DiagnosisReport（补 metadata）
      const report: DiagnosisReport = {
        id: opts.reportId,
        sessionId: opts.sessionId,
        mode: opts.mode,
        createdAt: Date.now(),
        generatedFromTurns: opts.turnCount,
        qProgress:
          parsed.progress.fullyCovered.length +
          parsed.progress.halfCovered.length,
        progress: parsed.progress,
        parts: parsed.parts,
        verdict: parsed.verdict,
        nextSession: parsed.nextSession,
        killQuote: parsed.killQuote,
      };

      return report;
    } catch (err) {
      lastErr = err as Error;
      if (attempt === 1) {
        console.warn(
          `[diagnosis-generator] 第 1 次失败，重试中：${lastErr.message}`
        );
      }
    }
  }

  throw new Error(
    `诊断书生成失败（已重试 1 次）：${lastErr?.message || "unknown"}`
  );
}

// =========================================================================
// 短 ID 生成
// =========================================================================

export function generateReportId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `d_${ts}_${rand}`;
}
