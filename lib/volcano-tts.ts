/**
 * ============================================================
 * 火山引擎豆包语音合成 2.0 客户端（v0.4）
 * ============================================================
 *
 * 协议：HTTP Chunked 单向流
 *   POST https://openspeech.bytedance.com/api/v3/tts/unidirectional
 *
 * 响应：NDJSON（每行一个 JSON）
 *   - code === 0        →  data 字段是 base64 音频片段，累积拼接
 *   - code === 20000000 →  流结束（句子结束 / 会话结束）
 *   - 其它 code         →  错误
 *
 * 鉴权（新版控制台简化方式，仅 3 个 Header）：
 *   X-Api-App-Id: <VOLC_APP_ID>
 *   X-Api-Access-Key: <VOLC_API_KEY>
 *   X-Api-Resource-Id: seed-tts-2.0     （uranus 2.0 音色专用）
 *
 * 三档人设 ↔ 音色映射（硬编码，保持人格一致性）：
 *   casual   （随便聊）→ 清澈梓梓  zh_female_qingchezizi_uranus_bigtts
 *   rational （讲道理）→ 玲玲      zh_female_lingling_uranus_bigtts
 *   scathing （扇巴掌）→ 顾姐      zh_female_gujie_uranus_bigtts
 *
 * 2000 字截断（和原 lib/eleven.ts 行为一致，控成本）。
 * 服务端调用，前端永不接触 API Key。
 * ============================================================
 */

export type ModeId = "casual" | "rational" | "scathing";

/** 每档人设的音色配置：speaker + emotion + speech_rate + resourceId */
interface VoiceProfile {
  /** 火山 voice_type（api 层叫 speaker） */
  speaker: string;
  /** 产品昵称（仅日志） */
  displayName: string;
  /**
   * 模型路由（Header X-Api-Resource-Id）：
   *   seed-tts-2.0 → uranus 系列音色（豆包语音合成 2.0）
   *   seed-tts-1.0 → ICL / mars / moon / saturn 等音色（豆包语音合成 1.0）
   */
  resourceId: "seed-tts-2.0" | "seed-tts-1.0" | "seed-tts-1.0-concurr";
  /**
   * 情感（2.0 音色支持）：
   * happy / sad / angry / surprised / fear / hate /
   * excited / coldness / neutral / ...
   * 1.0 音色不识别此参数，火山会忽略
   */
  emotion?: string;
  /** 语速 -50~100（0=原速，100=2倍速，-50=0.5倍速）。30 ≈ 1.3倍速 */
  speech_rate?: number;
}

/**
 * 三档人设 ↔ 音色映射
 *
 * 速度策略（v0.4.1）：基线 1.3x（speech_rate=30），
 *   - casual / rational：30（1.3x，自然不拖）
 *   - scathing：25（1.25x，比另外两档略慢，给冷感留拖音空间）
 */
const VOICE_CONFIG: Record<ModeId, VoiceProfile> = {
  casual: {
    speaker: "zh_female_qingchezizi_uranus_bigtts",
    displayName: "清澈梓梓（北京大妞）",
    resourceId: "seed-tts-2.0",
    emotion: "neutral",
    speech_rate: 30,
  },
  rational: {
    speaker: "zh_female_lingling_uranus_bigtts",
    displayName: "玲玲（清冷阿梦）",
    resourceId: "seed-tts-2.0",
    emotion: "calm",
    speech_rate: 30,
  },
  scathing: {
    // v0.4.1 换：原 zh_female_gujie_uranus_bigtts 顾姐台湾腔过重
    speaker: "ICL_zh_female_aojiaonvyou_tob",
    displayName: "傲娇女友（高冷御姐）",
    resourceId: "seed-tts-1.0",
    // ICL 1.0 音色不识别 emotion 字段，但保留也无妨
    emotion: "coldness",
    speech_rate: 25,
  },
};

const ENDPOINT =
  "https://openspeech.bytedance.com/api/v3/tts/unidirectional";

function getEnv(key: string): string {
  const v = process.env[key];
  if (!v) {
    throw new Error(
      `${key} 未配置。请在 .env.local 或 Vercel 环境变量中设置。`
    );
  }
  return v;
}

export interface VolcanoTTSOptions {
  text: string;
  mode: ModeId;
}

/**
 * 合成语音，返回完整 mp3 二进制。
 *
 * 实现细节：
 * 1. 发送 HTTP POST，Content-Type: application/json
 * 2. 响应是 Transfer-Encoding: chunked 的 NDJSON 流
 * 3. 用 ReadableStream + TextDecoder 按行解析
 * 4. 累积所有 code=0 的 base64 片段，合成总 mp3 ArrayBuffer
 * 5. 任何错误（网络 / 非 0 非 20000000 的 code）→ 抛错让上层 500
 */
export async function synthesizeSpeech(
  options: VolcanoTTSOptions
): Promise<{ audio: ArrayBuffer; contentType: string }> {
  const { text, mode } = options;

  const profile = VOICE_CONFIG[mode];
  if (!profile) {
    throw new Error(`未知 mode: ${mode}`);
  }

  const trimmed = text.trim();
  if (!trimmed) throw new Error("text 不能为空");

  const maxChars = Number(process.env.TTS_MAX_CHARS || 2000);
  if (trimmed.length > maxChars) {
    throw new Error(`文本过长，单次合成限制 ${maxChars} 字`);
  }

  const apiKey = getEnv("VOLC_API_KEY");
  // resourceId 由音色档位决定（uranus 走 2.0，ICL 走 1.0），
  // 不再从环境变量读取——一台应用同时跑两个版本是常态
  const resourceId = profile.resourceId;
  // VOLC_APP_ID 在新版控制台鉴权下不需要发给火山，但读出来用于追踪/日志
  void process.env.VOLC_APP_ID;

  const body = {
    user: { uid: "xingxing-ink" },
    req_params: {
      text: trimmed,
      speaker: profile.speaker,
      audio_params: {
        format: "mp3",
        sample_rate: 24000,
        ...(profile.emotion ? { emotion: profile.emotion } : {}),
        ...(typeof profile.speech_rate === "number"
          ? { speech_rate: profile.speech_rate }
          : {}),
      },
    },
  };

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // 新版控制台简化鉴权（PDF 第 5-7 页）：仅需 X-Api-Key + X-Api-Resource-Id
      "X-Api-Key": apiKey,
      "X-Api-Resource-Id": resourceId,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(
      `火山 TTS HTTP 错误: ${response.status} ${response.statusText}. ${errText}`
    );
  }

  if (!response.body) {
    throw new Error("火山 TTS 返回空流");
  }

  // 流式读 NDJSON，累积 base64 音频片段
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  const audioChunks: Uint8Array[] = [];
  let buffer = "";
  let finished = false;
  let lastErrorCode: number | null = null;
  let lastErrorMsg = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // 以换行分隔逐行处理，未完结的行留在 buffer 里等下一块
    let newlineIdx: number;
    while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIdx).trim();
      buffer = buffer.slice(newlineIdx + 1);
      if (!line) continue;

      let obj: {
        code?: number;
        message?: string;
        data?: string;
      };
      try {
        obj = JSON.parse(line);
      } catch {
        // 非法 JSON 行跳过，继续下一行
        continue;
      }

      if (obj.code === 0 && typeof obj.data === "string" && obj.data) {
        // 关键：obj.data 是 base64 编码的音频片段
        audioChunks.push(base64ToUint8Array(obj.data));
      } else if (obj.code === 20000000) {
        // 会话/句子结束
        finished = true;
      } else if (typeof obj.code === "number" && obj.code !== 0) {
        // 其它非零 code 视为错误
        lastErrorCode = obj.code;
        lastErrorMsg = obj.message || "";
      }
    }
  }

  // 末尾剩余不含 \n 的行（防御性）
  const tail = buffer.trim();
  if (tail) {
    try {
      const obj = JSON.parse(tail);
      if (obj.code === 0 && typeof obj.data === "string" && obj.data) {
        audioChunks.push(base64ToUint8Array(obj.data));
      } else if (obj.code === 20000000) {
        finished = true;
      }
    } catch {
      /* ignore */
    }
  }

  if (audioChunks.length === 0) {
    const hint =
      lastErrorCode !== null
        ? `火山返回错误 code=${lastErrorCode} message="${lastErrorMsg}"`
        : "火山 TTS 未返回任何音频数据";
    throw new Error(hint);
  }

  // 拼接所有音频片段为单一 ArrayBuffer
  const totalLen = audioChunks.reduce((sum, c) => sum + c.length, 0);
  const merged = new Uint8Array(totalLen);
  let offset = 0;
  for (const chunk of audioChunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  void finished; // 允许未显式收到 20000000 就走到这里（只要有数据就返）

  // Node 的 Uint8Array.buffer 可能带 byteOffset/length，切一下保干净
  const out = merged.buffer.slice(
    merged.byteOffset,
    merged.byteOffset + merged.byteLength
  );

  return {
    audio: out,
    contentType: "audio/mpeg",
  };
}

/** Node & Edge runtime 通用的 base64 → Uint8Array */
function base64ToUint8Array(b64: string): Uint8Array {
  // Node runtime 有 Buffer；Edge runtime 没有但有 atob
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(b64, "base64"));
  }
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}
