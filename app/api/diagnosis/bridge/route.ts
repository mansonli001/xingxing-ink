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
用户已经聊了一阵子，想看诊断书，但姐发现还有几件事没问到——你要为每个主题写一个具体的追问问题，让用户在弹窗里直接答。

# 必须遵守
1. **每个主题写一个问题**，要有画面感（不要抽象）。
2. **每题问题分两段**（用 \\n 分隔）：
   - 第一段：姐姐口吻的"戳"（一句话开门，带情绪不啰嗦），10-30字
   - 第二段：具体要用户提供什么信息（数字/场景/名字/时间），20-50字
3. **不准列 Q1/Q2/Q3 这种编号**——用人话说。
4. **不要"亲""宝""您"**，要"你"。
5. **不要重复主题名作为开头**，主题名前端会自己显示。
6. **整段问题长度**：每题 30-80 字。
7. **三档差异化**：${
    mode === "casual"
      ? "随便聊档=嫌弃宠溺，多用'你呀'式吐槽"
      : mode === "rational"
      ? "讲道理档=理性精准，要数字/区间/单位经济"
      : "扇巴掌档=精准戳痛点，敢用反问"
  }

# 你要追问的主题
${topicsText}

# 输出格式（严格 JSON · 不要任何前缀后缀）
{
  "questions": [
    { "qid": <题号>, "prompt": "姐姐口吻的两段式追问" },
    ...
  ]
}
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
          { role: "user", content: "请输出 JSON。" },
        ],
        temperature: 0.85,
        max_tokens: 500,
        stream: false,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!llmRes.ok) {
      const errText = await llmRes.text().catch(() => "");
      console.error("[/api/diagnosis/bridge] LLM 失败：", llmRes.status, errText);
      return NextResponse.json(
        {
          ok: true,
          // v0.7.12.2：失败也返 ok=true 配合静态兜底，不让前端崩
          questions: buildFallbackQuestions(mode, missingQuestions),
          source: "fallback",
        },
        { status: 200 }
      );
    }

    const data = await llmRes.json();
    const content: string =
      data?.choices?.[0]?.message?.content?.trim() ?? "";

    if (!content) {
      return NextResponse.json(
        {
          ok: true,
          questions: buildFallbackQuestions(mode, missingQuestions),
          source: "fallback",
        },
        { status: 200 }
      );
    }

    // 解析 JSON
    let parsedQuestions: Array<{ qid: number; prompt: string }> = [];
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed?.questions)) {
        parsedQuestions = parsed.questions
          .filter(
            (q: unknown): q is { qid: number; prompt: string } =>
              typeof q === "object" &&
              q !== null &&
              typeof (q as { qid: unknown }).qid === "number" &&
              typeof (q as { prompt: unknown }).prompt === "string" &&
              ((q as { prompt: string }).prompt as string).trim().length > 0
          )
          .map((q: { qid: number; prompt: string }) => ({
            qid: q.qid,
            prompt: q.prompt.trim(),
          }));
      }
    } catch (parseErr) {
      console.warn("[/api/diagnosis/bridge] JSON 解析失败：", parseErr);
    }

    // 解析失败 → 兜底
    if (parsedQuestions.length === 0) {
      return NextResponse.json(
        {
          ok: true,
          questions: buildFallbackQuestions(mode, missingQuestions),
          source: "fallback",
        },
        { status: 200 }
      );
    }

    // 补齐缺失的题（LLM 可能漏题 → 用兜底补）
    const fallbackMap = new Map(
      buildFallbackQuestions(mode, missingQuestions).map((q) => [q.qid, q])
    );
    const finalQuestions = missingQuestions.map((mq) => {
      const found = parsedQuestions.find((p) => p.qid === mq.qid);
      if (found) {
        return { qid: found.qid, name: mq.name, prompt: found.prompt };
      }
      return (
        fallbackMap.get(mq.qid) ?? {
          qid: mq.qid,
          name: mq.name,
          prompt: "把你想到的写下来。",
        }
      );
    });

    return NextResponse.json(
      {
        ok: true,
        questions: finalQuestions,
        source: "llm",
      },
      { status: 200 }
    );
  } catch (err) {
    const msg = (err as Error).message ?? "未知错误";
    console.error("[/api/diagnosis/bridge] 异常：", msg);
    return NextResponse.json(
      {
        ok: true,
        questions: buildFallbackQuestions(mode, missingQuestions),
        source: "fallback",
      },
      { status: 200 }
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
// 静态兜底：每题 × 三档差异化追问 prompt（v0.7.12.2）
// LLM 挂了也能用 · 三档语气区分
// ==========================================================================

interface FallbackQuestion {
  qid: number;
  name: string;
  prompt: string;
}

function buildFallbackQuestions(
  mode: ModeId,
  missingQuestions: MissingQuestion[]
): FallbackQuestion[] {
  return missingQuestions.map((q) => ({
    qid: q.qid,
    name: q.name,
    prompt: FALLBACK_PROMPTS[q.qid]?.[mode] ?? "把你想到的写下来。",
  }));
}

const FALLBACK_PROMPTS: Record<number, Record<ModeId, string>> = {
  1: {
    casual:
      "你这事到底是给谁做的？\n说个具体的人——年龄、职业、平时干啥的，姐脑子里得有个画面。",
    rational:
      "目标用户画像还没说透。\n年龄段、职业、月收入区间、典型使用场景，给姐一个能验证的画像。",
    scathing:
      "「年轻人」「都市白领」这种话别糊弄姐——\n说一个你身边真存在的人，他叫什么、多大、靠什么吃饭。",
  },
  2: {
    casual:
      "用户到底在愁啥？\n他不爽什么、想偷懒什么、害怕什么——挑一个具体场景说一下。",
    rational:
      "用户的真实痛点是什么？\n他现在用什么替代方案？花多少钱？多久搞一次？为什么不爽？",
    scathing:
      "你以为的痛点 vs 用户真痛点——\n说一个用户已经为这事掏过钱的证据，没有就承认是你拍脑袋的。",
  },
  3: {
    casual:
      "凭什么是你做这个？\n你之前干过相关的事吗？还是认识谁？或者就是兴趣？",
    rational:
      "你的核心壁垒是啥？\n独家数据 / 团队背景 / 技术 / 渠道 / 资金——挑一个能写进 BP 的点。",
    scathing:
      "市场上 100 个人都想做这个——\n凭啥你做得成？别说情怀，给个别人复制不了的东西。",
  },
  4: {
    casual:
      "第一批用户从哪来？\n小红书？朋友圈？社群？还是地推？说一个你打算先试的。",
    rational:
      "冷启动渠道 + 单用户获客成本预估？\n比如小红书 KOC ¥X / 用户、抖音信息流 ¥X / 用户。",
    scathing:
      "「免费推广 + 自然增长」这种话姐听吐了——\n说一个你已经付钱测试过的获客渠道，不然就是空谈。",
  },
  5: {
    casual:
      "用户为啥会回来？\n你想让他每天打开？每周一次？还是用完就忘？",
    rational:
      "留存机制设计：\n核心钩子（功能/内容/社交/数据）是什么？次日留存目标多少？",
    scathing:
      "你这事用户用一次就够了 vs 必须每天回来——\n是哪种？说不清楚就是没设计。",
  },
  6: {
    casual:
      "钱怎么收？\n订阅？一次买断？广告？还是先免费？",
    rational:
      "收入模型：\n定价 / 客单价 / 订阅周期 / 转化率假设。给一组数。",
    scathing:
      "「先做大再变现」是诈骗——\n你这事用户为什么愿意掏钱？掏多少？现在就答。",
  },
  7: {
    casual:
      "钱大头花在哪？\n服务器？买流量？人力？给姐一个估算就行。",
    rational:
      "成本结构：\nCAC / 单用户服务成本 / LTV 假设 / 烧钱周期。",
    scathing:
      "做这事一个用户跑下来你要烧多少？——\n收回来要多久？算不清楚就是没想明白。",
  },
  8: {
    casual:
      "你这事得靠谁？\n供应链？平台？投资人？还是某个朋友？",
    rational:
      "关键依赖：\n外部 API / 供应商 / 渠道方 / 监管——挑一个最致命的说，断了你怎么办。",
    scathing:
      "你的命脉攥在谁手里？——\n那个人/那家公司哪天翻脸，你这事直接死，敢说吗？",
  },
  9: {
    casual:
      "MVP 砍到只剩一件事，是啥？\n用户拿到第一版能干什么？",
    rational:
      "MVP 范围：\n核心 Job 是什么？砍掉哪些功能？多久能做出来？",
    scathing:
      "把 MVP 砍到一句话——\n用户打开你的产品第一秒做什么？说不出就是想做产品大全。",
  },
  10: {
    casual:
      "用户怎么用你的产品？\n打开 → 看到啥 → 干嘛 → 走？走一遍流程。",
    rational:
      "用户旅程：\n首次进入 → 激活 → 留存 → 付费 → 推荐，关键节点的转化率假设。",
    scathing:
      "用户从 0 到付费这条路你设计过吗？——\n中间任何一步流失你都不知道，怎么改？",
  },
  11: {
    casual:
      "用户用得越多，你就越强，是吗？\n哪里会越用越值钱？",
    rational:
      "数据飞轮 / 网络效应：\n用户行为产生什么数据？这数据怎么反哺产品？复合增长点在哪？",
    scathing:
      "没有飞轮的产品就是工具——\n你这事用户多了有什么是别人复制不来的？答不上就是工具。",
  },
  12: {
    casual:
      "你这人靠不靠谱？\n做这事要全力投入还是兼职？做多久不见效就放弃？",
    rational:
      "创始人体检：\n动机 / 止损线 / 机会成本 / 全职还是兼职。给姐一个能信的答案。",
    scathing:
      "失败成本你算过吗？——\n烧多少钱、亏多少时间是你的底线？说不清楚就是赌博。",
  },
};
