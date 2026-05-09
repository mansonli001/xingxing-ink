import { NextRequest } from "next/server";
import { synthesizeSpeech } from "@/lib/eleven";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TTSRequestBody {
  text: string;
  voice_id?: string;
  stability?: number;
  similarity_boost?: number;
  style?: number;
}

/**
 * 文本预处理：去除 Markdown 标记，让 TTS 朗读更自然
 */
function stripMarkdownForTTS(text: string): string {
  return text
    // 移除代码块
    .replace(/```[\s\S]*?```/g, "")
    // 移除行内代码反引号
    .replace(/`([^`]+)`/g, "$1")
    // 移除标题井号
    .replace(/^#{1,6}\s+/gm, "")
    // 移除粗体/斜体标记
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    // 移除链接，保留文字
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // 移除列表符号
    .replace(/^[\s]*[-*+]\s+/gm, "")
    .replace(/^[\s]*\d+\.\s+/gm, "")
    // 多余空行折叠
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function POST(req: NextRequest) {
  // 服务端二道关：开关未启用 / 未配 Key → 直接劝退，不去碰 ElevenLabs
  if (process.env.NEXT_PUBLIC_TTS_ENABLED !== "true") {
    return new Response(
      JSON.stringify({ error: "语音功能未启用（NEXT_PUBLIC_TTS_ENABLED=false）" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!process.env.ELEVEN_API_KEY || process.env.ELEVEN_API_KEY.startsWith("xi-xxx")) {
    return new Response(
      JSON.stringify({ error: "未配置 ELEVEN_API_KEY，无法合成语音" }),
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

  const text = stripMarkdownForTTS(rawText);
  if (!text) {
    return new Response(
      JSON.stringify({ error: "文本去格式后为空" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { audio, contentType } = await synthesizeSpeech({
      text,
      voiceId: body.voice_id,
      stability: body.stability,
      similarityBoost: body.similarity_boost,
      style: body.style,
    });

    return new Response(audio, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "TTS 合成失败";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
