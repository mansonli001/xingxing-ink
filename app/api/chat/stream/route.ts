import { NextRequest } from "next/server";
import { streamChat, type ChatMessage } from "@/lib/deepseek";
import { getMode, loadSystemPrompt, MODES, type ModeId } from "@/lib/prompts";
import {
  appendMessage,
  getOrCreateSession,
} from "@/lib/session";

export const runtime = "nodejs"; // 需要 fs 读 prompt
export const dynamic = "force-dynamic";

interface ChatRequestBody {
  message: string;
  mode?: string;
  session_id?: string;
}

export async function POST(req: NextRequest) {
  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return new Response(
      JSON.stringify({ error: "请求体不是合法 JSON" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const message = (body.message || "").trim();
  if (!message) {
    return new Response(
      JSON.stringify({ error: "message 不能为空" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (message.length > 4000) {
    return new Response(
      JSON.stringify({ error: "单次输入不要超过 4000 字" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const modeId: ModeId = (body.mode as ModeId) in MODES
    ? (body.mode as ModeId)
    : "scathing";
  const mode = getMode(modeId);
  const { session, modeChanged } = getOrCreateSession(body.session_id, modeId);

  const systemPrompt = loadSystemPrompt(modeId);

  // 构造消息：system prompt → 历史 → [可选的人格切换提示] → 当前用户消息
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...session.history,
  ];

  if (modeChanged && session.history.length > 0) {
    const switchHint = buildModeSwitchHint(modeId, mode.label);
    messages.push({ role: "system", content: switchHint });
  }

  // v0.7.0 反套路化：注入"今日切入点"轮次种子
  // 基于 sessionId + 当前轮次哈希，从切入点池中选一个，
  // 让 AI 在多轮对话里有差异化关注点，避免"按维度顺序流水线追问"的套路感
  const turnHint = buildTurnFocusHint(session.id, session.history.length, modeId);
  if (turnHint) {
    messages.push({ role: "system", content: turnHint });
  }

  messages.push({ role: "user", content: message });

  // 先把用户消息写入历史
  appendMessage(session.id, { role: "user", content: message });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        send("meta", { session_id: session.id, mode: modeId });

        let assistantText = "";
        for await (const chunk of streamChat({
          messages,
          temperature: mode.temperature,
          maxTokens: mode.maxTokens,
        })) {
          assistantText += chunk;
          send("delta", { content: chunk });
        }

        appendMessage(session.id, {
          role: "assistant",
          content: assistantText,
        });

        send("done", {
          session_id: session.id,
          full: assistantText,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "未知错误";
        send("error", { message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

/**
 * 当用户在同一个会话中切换人格模式时，注入一条 system 提示，
 * 让新人格知道"我是刚被唤出来接替上一个人格的，要自然衔接，不要重新自我介绍"。
 */
function buildModeSwitchHint(newModeId: ModeId, newModeLabel: string): string {
  return [
    `[人格切换提示]`,
    `用户刚刚把你切换到了【${newModeLabel}】模式（id: ${newModeId}）。`,
    `在此之前，你和他已经用另一个人格聊过一些内容（见 history）。`,
    `现在请用【${newModeLabel}】的语气**直接承接**他当前这句话，不要：`,
    `- 重新自我介绍（别说"我现在是扇巴掌模式"）`,
    `- 复述之前聊过的内容`,
    `- 假装从来没聊过`,
    `你应该：`,
    `- 沿用之前的话题上下文，但用新人格的方式回应`,
    `- 如果切换很突兀（比如从扇巴掌切到随便聊），可以自然过渡："行吧，换个语气聊。"之类一句带过`,
    `- 保持角色一致性，不要混合风格`,
  ].join("\n");
}

/**
 * v0.7.0 反套路化：基于 sessionId + 当前轮次的轻量伪随机切入点注入
 *
 * 解决用户痛点："第一次聊很开心，第二次就觉得套路一致——都是先确定赛道、
 * 再问市场、再具体化、再可证伪、再最小验证。这样不会有人想用第三次。"
 *
 * 机制：每两轮（用户消息计数）切换一个"今日切入点"，从池中按 hash 抽，
 * 让 AI 在多轮对话里天然有不同的关注重心，避免按维度清单流水线追问。
 *
 * - 第 0-1 轮（开场）：不注入，让 AI 用首轮黄金公式自然开场
 * - 第 2 轮起：每两轮换一个切入点，避免每轮都换太碎
 * - 不同 sessionId 同一轮次也会抽到不同切入点（不只是时间漂移）
 */
const FOCUS_POOL = [
  "创始人真实动机（这事儿是不是逃避别的）",
  "用户具体到能指认（不是'年轻人 / 白领 / 程序员'这种模糊画像）",
  "付费假设（谁掏钱、掏多少、按什么节奏）",
  "竞品差异化（市面上已有的，你凭什么不一样）",
  "风险悖论（最可能死在哪、有没有内在矛盾）",
  "能力匹配（创始人凭什么能做成这个）",
  "替代方案（用户现在没你这个产品时怎么解决的）",
  "需求强度（如果不解决，用户损失多大）",
  "时机判断（为什么是现在，不是 3 年前 / 3 年后）",
  "终局想象（3 年后这事儿做成 / 黄了，分别是什么样）",
];

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // 转 32-bit int
  }
  return Math.abs(hash);
}

function buildTurnFocusHint(
  sessionId: string,
  historyLength: number,
  modeId: ModeId
): string | null {
  // history 里包含了 user + assistant 双向消息；user 轮数大致 = historyLength / 2
  // 第 0、1 轮不注入（让首轮黄金公式自然开场）
  const userTurnCount = Math.floor(historyLength / 2);
  if (userTurnCount < 1) return null;

  // 每 2 轮换一个切入点（避免每轮都换太碎，2-3、4-5、6-7…… 各一组）
  const turnGroup = Math.floor(userTurnCount / 2);
  const seed = hashCode(`${sessionId}:${turnGroup}`);
  const focus = FOCUS_POOL[seed % FOCUS_POOL.length];

  // 三档语气微差异
  const tone =
    modeId === "casual"
      ? "（姐姐这一轮可以多聊聊这个角度，但别死板，跟着用户走）"
      : modeId === "rational"
      ? "（御姐这一轮把火力优先放在这个维度，但仍要紧扣用户上一句的漏洞）"
      : "（这一轮先从这个角度找他最虚的地方扇——但灵魂仍是揭动机 + 数字 + 醒醒收尾）";

  return [
    `[今日切入点: ${focus}]`,
    tone,
    `这是后台基于本次对话的轮次随机生成的关注重心，**不是死命令**——`,
    `如果用户当前这句话明显在说别的，你可以接着用户走；`,
    `但如果用户的话给你留出空间，**优先围绕这个切入点追问**，`,
    `避免每次对话都按"赛道 → 市场 → 用户 → 商业 → MVP"的死板顺序问。`,
    `（不要在回复中提到"今日切入点"四个字——这是给你的内部指引）`,
  ].join("\n");
}
