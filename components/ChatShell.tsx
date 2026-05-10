"use client";

import { useEffect, useRef, useState } from "react";
import { Chat } from "./Chat";
import type { ChatMessageItem } from "./MessageBubble";
import type { ModeId } from "./modeMeta";
import { findPreset } from "../lib/presetReplies";

function uid() {
  return `msg_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/**
 * 把 API 报错翻译成御姐口吻——
 * 用户看到的不是"500 Internal Server Error"，
 * 而是"姐今天有点累"。
 */
function toFriendlyError(rawMsg: string): string {
  const m = (rawMsg || "").toLowerCase();

  // API Key 失效 / 未配置
  if (
    m.includes("api key") ||
    m.includes("apikey") ||
    m.includes("unauthor") ||
    m.includes("401") ||
    m.includes("invalid")
  ) {
    return [
      "*姐这边的钥匙好像出问题了。*",
      "",
      "可能是 DeepSeek API Key 没配置好，或者额度用完了。",
      "（如果你是站长，去 Vercel 检查一下 `DEEPSEEK_API_KEY` 这条环境变量。）",
    ].join("\n");
  }

  // 频率限制
  if (m.includes("rate") || m.includes("429") || m.includes("too many")) {
    return [
      "*姐今天被问得有点累，喘口气。*",
      "",
      "30 秒之后再试试——你这种问题值得姐认真回答，不想糊弄你。",
    ].join("\n");
  }

  // 超时 / 网络
  if (
    m.includes("timeout") ||
    m.includes("network") ||
    m.includes("fetch") ||
    m.includes("aborted") ||
    m.includes("econnreset")
  ) {
    return [
      "*姐刚才信号断了一下。*",
      "",
      "再发一遍试试。如果一直这样，可能是你这边网络不稳，或者姐这边的服务器在哆嗦。",
    ].join("\n");
  }

  // 服务端 5xx
  if (m.includes("500") || m.includes("502") || m.includes("503") || m.includes("504")) {
    return [
      "*姐这会儿有点恍惚。*",
      "",
      "稍等一会儿再来。如果一直恍惚，去 Vercel 看看后台日志。",
    ].join("\n");
  }

  // 输入太长
  if (m.includes("4000") || m.includes("too long") || m.includes("超过")) {
    return [
      "*你这一堆话，姐一口气熬不完。*",
      "",
      "拆成两次发吧——先告诉姐**最关键那段**，剩下的看姐怎么接。",
    ].join("\n");
  }

  // 兜底：未知错误，给一个不暴露细节但有温度的回复
  return [
    "*姐今天有点累，待会儿再聊。*",
    "",
    rawMsg
      ? `（如果你是站长想看具体原因：${rawMsg}）`
      : "（再试一次试试，应该是临时抽风。）",
  ].join("\n");
}

/**
 * 对话外壳 —— 单栏全屏布局
 * - 御姐剪影作为全屏背景（从右下角浮现）
 * - 对话流独占前景，不再分栏
 * - 所有屏幕尺寸保持一致的视觉风格
 *
 * 状态提升到这里，便于后续扩展（如记录/侧栏/多会话）
 */
export function ChatShell() {
  const [mode, setMode] = useState<ModeId>("scathing");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const turnCount = messages.filter((m) => m.role === "user").length;

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  function clearAll() {
    abortRef.current?.abort();
    setMessages([]);
    setSessionId(undefined);
  }

  async function sendMessageWith(rawText: string) {
    const text = rawText.trim();
    if (!text || streaming) return;

    // v0.4.2 预制快速路径：用户首次点击 EmptyState 9 个 tip 之一时，
    // 直接塞预制回复 + 预制 mp3，0 延迟、0 API 开销。
    // 仅在"完全空对话"状态下生效——后续追问全走真实 deepseek。
    const preset = messages.length === 0 ? findPreset(mode, text) : null;
    if (preset) {
      const userMsg: ChatMessageItem = {
        id: uid(),
        role: "user",
        content: text,
        done: true,
      };
      const assistantMsg: ChatMessageItem = {
        id: uid(),
        role: "assistant",
        content: preset.reply,
        done: true,
        mode,
        presetAudio: preset.audio,
      };
      setMessages([userMsg, assistantMsg]);
      // 不调 deepseek、不创建 session_id（让用户第二轮起再走真实 API）
      return;
    }

    const userMsg: ChatMessageItem = {
      id: uid(),
      role: "user",
      content: text,
      done: true,
    };
    const assistantMsg: ChatMessageItem = {
      id: uid(),
      role: "assistant",
      content: "",
      done: false,
      mode,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          mode,
          session_id: sessionId,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "对话失败" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const evt of events) {
          if (!evt.trim()) continue;
          let eventName = "message";
          let dataLine = "";
          for (const line of evt.split("\n")) {
            if (line.startsWith("event:")) {
              eventName = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              dataLine = line.slice(5).trim();
            }
          }
          if (!dataLine) continue;

          try {
            const data = JSON.parse(dataLine);
            if (eventName === "meta") {
              if (data.session_id) setSessionId(data.session_id);
            } else if (eventName === "delta") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, content: m.content + (data.content || "") }
                    : m
                )
              );
            } else if (eventName === "done") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id ? { ...m, done: true } : m
                )
              );
            } else if (eventName === "error") {
              throw new Error(data.message || "服务器错误");
            }
          } catch (e) {
            if (e instanceof Error && e.message) {
              throw e;
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        // 主动取消，不提示
      } else {
        const rawMsg = err instanceof Error ? err.message : "";
        const friendlyMsg = toFriendlyError(rawMsg);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? {
                  ...m,
                  content: m.content
                    ? m.content + "\n\n" + friendlyMsg
                    : friendlyMsg,
                  done: true,
                }
              : m
          )
        );
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  return (
    <Chat
      mode={mode}
      onModeChange={setMode}
      messages={messages}
      streaming={streaming}
      turnCount={turnCount}
      sendMessageWith={sendMessageWith}
      clearAll={clearAll}
    />
  );
}
