/**
 * 醒醒 · BP 拦截桥接 API（v0.7.12.1 新增）
 *
 * 用户聊够轮数但没聊够题数 → 点「出诊断书」被 gate 拦下 → 弹气泡选「继续聊」
 *   → 调本 API → 用当前档位口吻生成一段「等等姐还有 X 件事问你」的追问
 *   → 前端把这段话作为 assistant 消息塞回对话流
 *
 * 这条链路不进 stream 主流程（避免污染 chat/stream 的限流和判官）。
 * 限流：复用 diagnosis-rate-limit（防止用户反复点击刷成本）。
 *
 * 入参：
 *   {
 *     mode: "casual" | "rational" | "scathing",
 *     missingQuestions: [{ qid: 3, name: "凭什么是你", blades: 0 }, ...],
 *     sessionId?: string  // 用于限流维度
 *   }
 *
 * 返回：
 *   { ok: true, content: "等等。你急啥——\n姐还有两个口子没堵..." }
 */

import { NextRequest, NextResponse } from "next/server";
import { checkDiagnosisRateLimit } from "@/lib/security/diagnosis-rate-limit";
import type { ModeId } from "@/lib/prompts";
import type { MissingQuestion } from "@/lib/diagnosis/bp-gate";

export const runtime = "nodejs";
export const maxDuration = 15;

const VALID_MODES: ModeId[] = ["casual", "rational", "scathing"];

interface BridgeRequestBody {
  mode?: string;
  missingQuestions?: Array<{
    qid?: number;
    name?: string;
    blades?: number;
  }>;
  sessionId?: string;
}

const MODE_TONE: Record<ModeId, string> = {
  casual:
    "你是醒醒（随便聊档 · 行业百事通视角 · 嫌弃但宠溺的吐槽小妹）。语气：嫌弃宠溺底色 · 不端着 · 像姐姐拉着你聊。",
  rational:
    "你是醒醒（讲道理档 · 资深合伙人视角 · 冷静但锋利的御姐）。语气：施舍口吻 · 给路径 · 偏理性但不冰冷。",
  scathing:
    "你是醒醒（扇巴掌档 · 直觉怪兽 · 心理学家视角 · 精准狠的醒姐）。语气：翻转节奏 · 戳要害 · 但底色仍是醒人的。",
};

export async function POST(req: NextRequest) {
  // 1. 入参解析
  let body: BridgeRequestBody;
  try {
    body = (await req.json()) as BridgeRequestBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "请求体不是合法 JSON" },
      { status: 400 }
    );
  }

  const mode = body.mode as ModeId | undefined;
  if (!mode || !VALID_MODES.includes(mode)) {
    return NextResponse.json(
      { ok: false, error: "档位参数错误" },
      { status: 400 }
    );
  }

  const sessionId =
    typeof body.sessionId === "string" && body.sessionId.length > 0
      ? body.sessionId
      : undefined;

  // 过滤 + 校验 missingQuestions（最多取前 2 题）
  const missingQuestions: MissingQuestion[] = (body.missingQuestions ?? [])
    .filter(
      (q) =>
        typeof q.qid === "number" &&
        typeof q.name === "string" &&
        q.name.trim().length > 0
    )
    .slice(0, 2)
    .map((q) => ({
      qid: q.qid as number,
      name: (q.name as string).trim(),
      blades: typeof q.blades === "number" ? q.blades : 0,
      priority: 99,
    }));

  if (missingQuestions.length === 0) {
    return NextResponse.json(
      { ok: false, error: "没有需要追问的题" },
      { status: 400 }
    );
  }

  // 2. 限流（复用诊断书限流，防刷）
  const rl = checkDiagnosisRateLimit(req, sessionId);
  if (!rl.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: rl.message,
        retryAfterSeconds: rl.retryAfterSeconds,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSeconds) },
      }
    );
  }

  // 3. 调 LLM 生成追问
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "服务暂时不可用" },
      { status: 500 }
    );
  }

  const tone = MODE_TONE[mode];

  // 拼追问目标
  const topicsText = missingQuestions
    .map(
      (q, i) =>
        `${i + 1}. 「${q.name}」（关键词：${describeQuestion(q.qid)}）`
    )
    .join("\n");

  const systemPrompt = `${tone}

# 场景
用户已经聊了一阵子，想看诊断书，但姐发现还有几件事没问到——你要把用户拉回来追问。

# 必须遵守
1. **开头一句拦截**：直接打断用户的"出 BP"动作，类似「等等」「先别急」「这就想跑？」（按档位口吻）。不要用"亲""宝""您"。
2. **追问内容**：针对下面给出的 ${missingQuestions.length} 个主题，每个主题写 1-2 个具体问题（不要抽象，要有画面感）。
3. **结尾留勾子**：让用户回答完这几题，姐就给写诊断书。
4. **不要重复用户已经说过的话**——你看不到对话历史，但要写得像"姐看完前面这一阵聊天后想再问的事"。
5. **不准列 Q1/Q2/Q3 这种编号**——用人话说。
6. **长度**：120-220 字。不要写成模板，写成姐姐说人话。
7. **不要上来就说"你的产品"——要带具体场景**（比如"你做这个 AI 陪伴" / "你刚说的那个东西"）。

# 你要追问的主题
${topicsText}

# 输出
直接输出醒醒说的话，不要前缀"醒醒说："，不要 Markdown 标题，不要 emoji。
`;

  try {
    const baseUrl =
      process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
    const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";

    const llmRes = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "请按要求输出追问。" },
        ],
        temperature: 0.85,
        max_tokens: 400,
        stream: false,
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!llmRes.ok) {
      const errText = await llmRes.text().catch(() => "");
      console.error("[/api/diagnosis/bridge] LLM 失败：", llmRes.status, errText);
      return NextResponse.json(
        {
          ok: false,
          error: "醒醒喝口水，几秒后再点一下",
          // 兜底文案：LLM 挂了也能用静态版
          fallback: buildFallbackContent(mode, missingQuestions),
        },
        { status: 502 }
      );
    }

    const data = await llmRes.json();
    const content: string =
      data?.choices?.[0]?.message?.content?.trim() ?? "";

    if (!content) {
      return NextResponse.json(
        {
          ok: false,
          error: "生成失败",
          fallback: buildFallbackContent(mode, missingQuestions),
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        content,
        targetQuestions: missingQuestions.map((q) => q.qid),
      },
      { status: 200 }
    );
  } catch (err) {
    const msg = (err as Error).message ?? "未知错误";
    console.error("[/api/diagnosis/bridge] 异常：", msg);
    return NextResponse.json(
      {
        ok: false,
        error: "醒醒走神了，再点一下",
        fallback: buildFallbackContent(mode, missingQuestions),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "Method not allowed" },
    { status: 405 }
  );
}

// ==========================================================================
// 题号 → 关键词描述（喂给 LLM 作为追问方向参考）
// ==========================================================================

function describeQuestion(qid: number): string {
  const KEYWORDS: Record<number, string> = {
    1: "目标用户具体是谁，年龄/职业/场景/付费能力",
    2: "用户的真实痛点 / JTBD 雇佣任务 / 推力阻力",
    3: "凭什么是你做这个，独家资源 / 专业背景 / 真壁垒",
    4: "渠道获客 / 冷启动方法 / 第一批用户从哪来",
    5: "用户为什么会留下来 / 留存机制 / 上瘾环",
    6: "怎么收钱 / 定价模式 / 北极星指标",
    7: "成本结构 / CAC / LTV / 烧钱模型",
    8: "外部依赖 / 关键合作方 / 兜底方案",
    9: "MVP 长什么样 / 砍到什么程度 / 核心 Job",
    10: "用户怎么用 / 用户旅程 / 完整闭环",
    11: "数据飞轮 / 复合增长 / Hooked Investment",
    12: "创始人靠不靠谱 / 动机 / 止损线 / 机会成本",
  };
  return KEYWORDS[qid] ?? "（未知主题）";
}

// ==========================================================================
// 兜底文案（LLM 挂了也能给出基本可用的追问）
// ==========================================================================

function buildFallbackContent(
  mode: ModeId,
  missingQuestions: MissingQuestion[]
): string {
  const opener: Record<ModeId, string> = {
    casual: "等等。你别急着出诊断书——",
    rational: "先别急。出诊断书之前，姐还有两件事要确认。",
    scathing: "急什么？——这俩事你没说清楚，姐写出来的是诊断书还是占卜？",
  };

  const items = missingQuestions
    .map(
      (q, i) =>
        `${i + 1}. 「${q.name}」——${describeQuestion(q.qid).split(" / ")[0]}`
    )
    .join("\n");

  const tail: Record<ModeId, string> = {
    casual: "你随便挑一个先答，姐顺着聊。",
    rational: "把这俩说清楚，姐立刻给你写诊断书。",
    scathing: "把这俩说清楚——别绕，给具体的。",
  };

  return `${opener[mode]}\n\n${items}\n\n${tail[mode]}`;
}
