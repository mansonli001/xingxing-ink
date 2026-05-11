import { NextRequest } from "next/server";
import { streamChat, type ChatMessage } from "@/lib/deepseek";
import { getMode, buildSystemPrompt, MODES, type ModeId } from "@/lib/prompts";
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

  const rawMessage = (body.message || "").trim();
  if (!rawMessage) {
    return new Response(
      JSON.stringify({ error: "message 不能为空" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (rawMessage.length > 4000) {
    return new Response(
      JSON.stringify({ error: "单次输入不要超过 4000 字" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // v0.7.3：解析「追问这一段」一键直发标记
  // 格式：__FOLLOWUP__|anchor|utterance
  const followUp = parseFollowUp(rawMessage);
  const message = followUp ? followUp.utterance : rawMessage;

  const modeId: ModeId = (body.mode as ModeId) in MODES
    ? (body.mode as ModeId)
    : "scathing";
  const mode = getMode(modeId);
  const { session, modeChanged } = getOrCreateSession(body.session_id, modeId);

  // v0.7.4：按轮次 + 用户输入动态组装 system prompt
  //
  //   - userTurnCount 是「用户本轮是第几次发言」（1 起）
  //   - session.history 里是前 N 轮的 user+assistant 对话；本轮 user 消息还没写入
  //   - 所以 userTurnCount = floor(history.length / 2) + 1
  const userTurnCount = Math.floor(session.history.length / 2) + 1;
  const historySummary = session.history
    .slice(-6) // 最近 3 轮（user+assistant 各 3 条）
    .map((m) => m.content)
    .join(" ");

  // v0.7.9：把最近 4 轮（user+assistant 各 4 条）传给 picker
  // 用于推断当前在攻哪个 Q + 第几把刀（粘性 3 轮决策）
  const recentHistory = session.history.slice(-8).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const systemPrompt = buildSystemPrompt(modeId, userTurnCount, message, historySummary, recentHistory);

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

  // v0.7.3：如果是「追问这一段」一键直发，额外注入 DIRECTOR_NOTE
  //        让 AI 明确"针对上条回复里的锚点再深挖一层"
  if (followUp) {
    const followUpHint = buildFollowUpHint(followUp.anchor, modeId);
    messages.push({ role: "system", content: followUpHint });
  }

  messages.push({ role: "user", content: message });

  // 先把用户消息写入历史（用自然话术，不是带标记的原串）
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
        // v0.7.6：流式后置过滤器，扫掉 LLM 仍漏掉的舞台指示/旁白（圆括号/方括号包裹的动作描写）
        // 策略：按行缓冲——完整行出现时先过滤再发送，避免过滤把跨 chunk 的正常内容切碎
        let lineBuffer = "";
        const flushLine = (line: string) => {
          const cleaned = stripStageDirections(line);
          if (cleaned) {
            assistantText += cleaned;
            send("delta", { content: cleaned });
          }
        };

        for await (const chunk of streamChat({
          messages,
          temperature: mode.temperature,
          maxTokens: mode.maxTokens,
        })) {
          lineBuffer += chunk;
          // 只要缓冲里出现换行，就可以切出完整行过滤
          let nlIdx = lineBuffer.indexOf("\n");
          while (nlIdx >= 0) {
            const line = lineBuffer.slice(0, nlIdx + 1); // 含 \n
            lineBuffer = lineBuffer.slice(nlIdx + 1);
            flushLine(line);
            nlIdx = lineBuffer.indexOf("\n");
          }
        }
        // 流结束时把剩余 buffer 也过滤一次
        if (lineBuffer) {
          flushLine(lineBuffer);
          lineBuffer = "";
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
    `[DIRECTOR_NOTE · 仅你可见，永不输出]`,
    `用户刚刚把你切换到了【${newModeLabel}】模式（id: ${newModeId}）。`,
    `在此之前，你和他已经用另一个人格聊过一些内容（见 history）。`,
    `现在请用【${newModeLabel}】的语气**直接承接**他当前这句话，不要：`,
    `- 重新自我介绍（别说"我现在是扇巴掌模式"）`,
    `- 复述之前聊过的内容`,
    `- 假装从来没聊过`,
    `- 在回复中提到"DIRECTOR_NOTE"、"模式"、"切换"等元词汇`,
    `- 输出方括号 [...] 或舞台指示`,
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
    `[DIRECTOR_NOTE · 仅你可见，永不输出]`,
    `本轮关注重心：${focus}`,
    tone,
    ``,
    `⛔ 强制规则：`,
    `- 绝不在回复中提及"DIRECTOR_NOTE"、"关注重心"、"切入点"、"按规则"等元词汇`,
    `- 绝不输出方括号 [...] 或舞台指示`,
    `- 这是后台导演笔记，只用来微调你这一轮的关注方向，不是给用户看的`,
    `- 如果用户当前这句话明显在说别的，跟着用户走；这只是建议不是死命令`,
    `- 你的回复就是醒醒此刻直接对人开口说的话——一句不多，一句不少`,
  ].join("\n");
}

/**
 * v0.7.3：解析「追问这一段」一键直发标记
 *
 * 前端格式：`__FOLLOWUP__|anchor|utterance`
 * - anchor：AI 上条回复里被点击的锚点句（用于后端注入 DIRECTOR_NOTE 让 AI 知道深挖哪里）
 * - utterance：给用户看的自然话术（会替代 raw message 写进 history 和发给模型）
 *
 * 如果不是追问标记，返回 null，走普通消息流程。
 */
function parseFollowUp(
  raw: string
): { anchor: string; utterance: string } | null {
  const PREFIX = "__FOLLOWUP__|";
  if (!raw.startsWith(PREFIX)) return null;
  const rest = raw.slice(PREFIX.length);
  const sepIdx = rest.indexOf("|");
  if (sepIdx <= 0) return null;
  const anchor = rest.slice(0, sepIdx).trim();
  const utterance = rest.slice(sepIdx + 1).trim();
  if (!anchor || !utterance) return null;
  return { anchor, utterance };
}

/**
 * v0.7.3：「追问这一段」DIRECTOR_NOTE
 *
 * 用户点击了 AI 上条回复里的锚点句要求深挖。必须防止：
 * 1. AI 重复上条回复已经说过的话
 * 2. AI 跑题开新话题
 * 3. AI 把锚点当用户说的话（比如用户引用 AI 自己的金句）
 */
function buildFollowUpHint(anchor: string, modeId: ModeId): string {
  const tone =
    modeId === "casual"
      ? "（casual 档：保持嫌弃小妹语气，顺着这个锚点再翻一层，用新招牌——别再用上条用过的那招）"
      : modeId === "rational"
      ? "（rational 档：锚定这一点，推演它背后的逻辑漏洞或数据假设，用新的 forced choice 编号反问）"
      : "（scathing 档：锚定这一点，再扇一层更深的——从动机、悖论、逃避任选一个新角度，不要重复上条已经扇过的点）";

  return [
    `[DIRECTOR_NOTE · 仅你可见，永不输出]`,
    `用户刚刚点击了你上一条回复里的「追问这一段」按钮，`,
    `被点击的锚点是：「${anchor}」`,
    ``,
    `⚠️ 重要区分：这个锚点是**你自己**上一条说的话，**不是**用户新抛出来的 idea。`,
    `用户是在要求你针对这句话**再深挖一层**，不是让你复述它。`,
    ``,
    tone,
    ``,
    `⛔ 强制规则：`,
    `- 绝不重复上一条回复里已经说过的话（包括这个锚点本身）`,
    `- 绝不跑题开新话题——必须紧扣这个锚点`,
    `- 绝不把锚点句当成用户说的话去回应（比如又说"你要做下一个 DeepSeek？"开头——那是你自己上条说过的）`,
    `- 绝不在回复中提及"DIRECTOR_NOTE"、"锚点"、"追问这一段"等元词汇`,
    `- 换一个角度、换一个招牌动作，把这个锚点再往深处捅 1-2 层`,
    `- 回复末尾至少留一个**新的**具体反问（带选项的 forced choice，不是开放题）`,
  ].join("\n");
}

/**
 * v0.7.6：流式后置过滤器 · 扫掉 LLM 漏输出的舞台指示/旁白
 *
 * 即使 prompt 明令禁止，DeepSeek 在 casual 档仍倾向于用 `（笑了一声，靠在椅背上）`
 * 这类动作描写来传达"嫌弃小妹"的体感——纯 prompt 层防不住，必须代码层兜底。
 *
 * 策略（保守为主，不误伤正常内容）：
 * 1. 只扫"成段独立出现"的舞台指示（行首或段首）
 * 2. 只对**短动作描写**（≤ 40 字）出手
 * 3. 保留醒醒嘴里说的长引用（如 `用户说"（我觉得）这个好"` 这种用户引用）
 * 4. 同时处理中文/英文括号 `（）`、`()`、`【】`、`[]`
 *
 * @param text 一行文本（含尾部 \n 也可）
 * @returns 过滤后文本；如果整行就是舞台指示，返回空串
 */
function stripStageDirections(text: string): string {
  if (!text) return text;

  // 1. 行首独立存在的舞台指示（可能后跟空行或直接内容）
  //    例：`（把咖啡杯往桌上一搁，挑眉看你）陪伴类AI？...`
  //    例：`（笑了一声，靠在椅背上）\n\n哦？...`
  //    匹配：以括号开始 + 内部无换行 + 长度 ≤ 40 字（避免误伤长引用）
  text = text.replace(
    /^[\s]*[（(【\[][^（()【\]\n]{1,40}[)）】\]][\s]*/,
    ""
  );

  // 2. 独立成段的舞台指示（段首紧跟换行）
  //    例：`上一段结尾。\n\n（挑眉）\n\n下一段开头`
  text = text.replace(
    /\n\n[（(【\[][^（()【\]\n]{1,40}[)）】\]]\n\n/g,
    "\n\n"
  );

  return text;
}
