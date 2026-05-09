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
