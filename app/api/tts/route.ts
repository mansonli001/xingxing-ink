import { NextRequest } from "next/server";
import { synthesizeSpeech, type ModeId } from "@/lib/volcano-tts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TTSRequestBody {
  text: string;
  /** 当前对话模式，决定用哪档音色（默认 casual） */
  mode?: ModeId;
}

const VALID_MODES: ModeId[] = ["casual", "rational", "scathing"];

/**
 * 文本预处理：去除 Markdown 标记，让 TTS 朗读更自然
 * （沿用 v0.3 原有的清洗规则）
 */
function stripMarkdownForTTS(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[\s]*[-*+]\s+/gm, "")
    .replace(/^[\s]*\d+\.\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function POST(req: NextRequest) {
  // 服务端二道关：开关未启用 / 未配 Key → 直接劝退
  if (process.env.NEXT_PUBLIC_TTS_ENABLED !== "true") {
    return new Response(
      JSON.stringify({
        error: "语音功能未启用（NEXT_PUBLIC_TTS_ENABLED=false）",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!process.env.VOLC_API_KEY) {
    return new Response(
      JSON.stringify({
        error: "未配置火山引擎 API Key（VOLC_API_KEY）",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: TTSRequestBody;
  try {
    body = (await req.json()) as TTSRequestBody;
  } catch {
    return new Response(JSON.stringify({ error: "请求体不是合法 JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rawText = (body.text || "").trim();
  if (!rawText) {
    return new Response(JSON.stringify({ error: "text 不能为空" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const mode: ModeId =
    body.mode && VALID_MODES.includes(body.mode) ? body.mode : "casual";

  const text = stripMarkdownForTTS(rawText);
  if (!text) {
    return new Response(
      JSON.stringify({ error: "文本去格式后为空" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { audio, contentType } = await synthesizeSpeech({ text, mode });
    return new Response(audio, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
        "X-Voice-Mode": mode,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "TTS 合成失败";
    console.error("[/api/tts] volcano error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
