/**
 * 十一维度 TTS 客户端封装（ElevenLabs 协议）
 * - 文本 → 御姐/女王音色 mp3
 * - 服务端调用，前端零接触 API Key
 */

const ELEVEN_BASE_URL =
  process.env.ELEVEN_BASE_URL || "https://api.elevenlabs.io";
const DEFAULT_MODEL = process.env.ELEVEN_MODEL || "eleven_multilingual_v2";

/**
 * 默认御姐风格音色 ID
 * 推荐音色：
 *  - "21m00Tcm4TlvDq8ikWAM" (Rachel) 美式知性
 *  - "EXAVITQu4vr4xnSDxMaL" (Bella) 御姐感最强
 *  - "MF3mGyEYCl7XYWbV9V6O" (Elli) 偏少女
 * 用户自定义可通过 ELEVEN_VOICE_ID 覆盖
 */
const DEFAULT_VOICE_ID =
  process.env.ELEVEN_VOICE_ID || "EXAVITQu4vr4xnSDxMaL";

export interface TTSOptions {
  text: string;
  voiceId?: string;
  modelId?: string;
  /** 0-1，越高越稳定但越平淡，御姐风格建议 0.4-0.55 */
  stability?: number;
  /** 0-1，越高越贴近原音色，建议 0.7+ */
  similarityBoost?: number;
  /** 0-1，风格夸张度（御姐建议 0.4-0.6） */
  style?: number;
}

function getApiKey(): string {
  const key = process.env.ELEVEN_API_KEY;
  if (!key) {
    throw new Error(
      "ELEVEN_API_KEY 未配置。请在 .env.local 设置 ELEVEN_API_KEY=xxx"
    );
  }
  return key;
}

/**
 * 合成语音，返回音频二进制 (mp3 buffer)
 */
export async function synthesizeSpeech(
  options: TTSOptions
): Promise<{ audio: ArrayBuffer; contentType: string }> {
  const apiKey = getApiKey();
  const {
    text,
    voiceId = DEFAULT_VOICE_ID,
    modelId = DEFAULT_MODEL,
    stability = 0.45,
    similarityBoost = 0.75,
    style = 0.5,
  } = options;

  const trimmed = text.trim();
  if (!trimmed) throw new Error("text 不能为空");
  if (trimmed.length > 2000) {
    // 过长文本截断（控制成本，MVP 可接受）
    throw new Error("文本过长，单次合成限制 2000 字");
  }

  const url = `${ELEVEN_BASE_URL}/v1/text-to-speech/${encodeURIComponent(
    voiceId
  )}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text: trimmed,
      model_id: modelId,
      voice_settings: {
        stability,
        similarity_boost: similarityBoost,
        style,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(
      `十一维度 TTS API 错误: ${response.status} ${response.statusText}. ${errText}`
    );
  }

  const audio = await response.arrayBuffer();
  const contentType = response.headers.get("Content-Type") || "audio/mpeg";
  return { audio, contentType };
}
