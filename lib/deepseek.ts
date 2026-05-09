/**
 * DeepSeek API 客户端封装
 * - OpenAI 兼容协议
 * - 支持流式输出 (SSE)
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface DeepSeekStreamOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

const DEEPSEEK_BASE_URL =
  process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
const DEFAULT_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

function getApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    throw new Error(
      "DEEPSEEK_API_KEY 未配置。请在 .env.local 设置 DEEPSEEK_API_KEY=sk-xxx"
    );
  }
  return key;
}

/**
 * 流式调用 DeepSeek，返回一个异步生成器，逐 chunk 吐出文本片段
 */
export async function* streamChat(
  options: DeepSeekStreamOptions
): AsyncGenerator<string, void, unknown> {
  const apiKey = getApiKey();
  const {
    messages,
    temperature = 0.8,
    maxTokens = 1024,
    model = DEFAULT_MODEL,
  } = options;

  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    const errText = await response.text().catch(() => "");
    throw new Error(
      `DeepSeek API 错误: ${response.status} ${response.statusText}. ${errText}`
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data:")) continue;

      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") return;

      try {
        const parsed = JSON.parse(payload);
        const delta = parsed?.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta.length > 0) {
          yield delta;
        }
      } catch {
        // 忽略解析失败的 chunk
      }
    }
  }
}
