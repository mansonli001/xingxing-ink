"use client";

import { useEffect, useRef, useState } from "react";
import { Chat } from "./Chat";
import type { ChatMessageItem } from "./MessageBubble";
import type { ModeId } from "./modeMeta";
import { findPreset } from "../lib/presetReplies";
import { track, sendHeartbeat } from "../lib/analytics";
import { useChatPersistence } from "../hooks/useChatPersistence";
import { Toast } from "./Toast";
import { SideDrawer } from "./SideDrawer";

function uid() {
  return `msg_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/**
 * 文本长度分桶（埋点用）—— 只记区间，不记内容
 *   xs:  0-20   字  · 一句话试探
 *   s:   21-80  字  · 简短想法
 *   m:   81-200 字  · 完整描述
 *   l:   201-500 字 · 长文/PRD 草稿
 *   xl:  500+   字  · 巨幅扔过来
 */
function bucketTextLength(s: string): "xs" | "s" | "m" | "l" | "xl" {
  const n = s.length;
  if (n <= 20) return "xs";
  if (n <= 80) return "s";
  if (n <= 200) return "m";
  if (n <= 500) return "l";
  return "xl";
}

/**
 * 错误分类（埋点用）—— 不传原文，只传类型
 * 与 toFriendlyError 的判断逻辑保持一致
 */
function classifyError(rawMsg: string): string {
  const m = (rawMsg || "").toLowerCase();
  if (
    m.includes("api key") ||
    m.includes("apikey") ||
    m.includes("unauthor") ||
    m.includes("401") ||
    m.includes("invalid")
  )
    return "auth";
  if (m.includes("rate") || m.includes("429") || m.includes("too many"))
    return "rate_limit";
  if (
    m.includes("timeout") ||
    m.includes("network") ||
    m.includes("fetch") ||
    m.includes("aborted") ||
    m.includes("econnreset")
  )
    return "network";
  if (
    m.includes("500") ||
    m.includes("502") ||
    m.includes("503") ||
    m.includes("504")
  )
    return "5xx";
  if (m.includes("4000") || m.includes("too long") || m.includes("超过"))
    return "too_long";
  return "unknown";
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
  // v0.4.2.4 Bug4a：默认人格改为"随便聊"——首屏直接给"扇巴掌"过于冲击，
  // 用户没准备好。"随便聊"温和入场，让用户自己升级到讲道理/扇巴掌。
  const [mode, setMode] = useState<ModeId>("casual");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // v0.7.9.6：抽屉式侧栏开关 + 重入 toast 文案（null 不显示） + 12 问命中数（隐喻进度）
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [qProgress, setQProgress] = useState(0);

  // v0.7.9.3 P4：会话持久化（localStorage 7天 TTL + 50条上限 + 隐私模式 fallback）
  // 用户反馈："没有储存，我之前聊过的，关了，就不见了"
  const { initial, hydrated, persist, clear: clearPersistence } =
    useChatPersistence();

  // mount 后用 initial 恢复 useState（v0.7.9.6：恢复时弹御姐风格 toast 提示重入）
  useEffect(() => {
    if (initial) {
      setMode(initial.mode);
      setSessionId(initial.sessionId);
      setMessages(initial.messages);
      // 埋点：会话恢复（用于看持久化的实际命中率）
      track("session_restored", {
        mode: initial.mode,
        message_count: initial.messages.length,
      });
      // v0.7.9.6：御姐风格重入 toast（仅在恢复了真实对话时弹）
      if (initial.messages.length > 0) {
        const lines = [
          "刚才聊到一半就跑了？",
          "回来了？姐还以为你被扇怕了。",
          "今天打算认真点不？",
        ];
        setToastMsg(lines[Math.floor(Math.random() * lines.length)]);
      }
    }
  }, [initial]);

  // 状态变化后自动写入 localStorage（hydrated 后才写，避免覆盖刚恢复的数据）
  useEffect(() => {
    if (!hydrated) return;
    persist({ mode, sessionId, messages });
  }, [mode, sessionId, messages, hydrated, persist]);

  const turnCount = messages.filter((m) => m.role === "user").length;

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  function clearAll() {
    abortRef.current?.abort();
    // 仅在确实有内容时记录"清空重开"——空状态点没意义
    if (messages.length > 0) {
      track("session_cleared", {
        mode,
        turn_count: turnCount,
      });
    }
    setMessages([]);
    setSessionId(undefined);
    setQProgress(0); // v0.7.9.6：重置 12 问进度
    // P4：同时清掉 localStorage，避免下次刷新又恢复出来
    clearPersistence();
  }

  /** 包一层 setMode：埋点 + 锁定后不让切换 */
  function handleModeChange(next: ModeId) {
    if (messages.length > 0) return; // 锁定后不允许切
    if (next === mode) return;
    track("mode_selected", { mode: next, from_mode: mode });
    setMode(next);
  }

  async function sendMessageWith(rawText: string) {
    const text = rawText.trim();
    if (!text || streaming) return;

    // v0.7.7：拆 __FOLLOWUP__ 标记
    //   apiText = 发给后端的完整 payload（含标记，后端识别）
    //   displayText = 渲染到用户气泡和写入 messages 的内容（只有自然话术，用户看不到内部标记）
    //
    // 旧 bug：直接把 `__FOLLOWUP__|anchor|utterance` 整串作为 userMsg.content 渲染，
    //        用户气泡显示一大坨 __FOLLOWUP__|...| 标记，极不专业。
    const apiText = text;
    let displayText = text;
    const isFollowUp = text.startsWith("__FOLLOWUP__|");
    if (isFollowUp) {
      const rest = text.slice("__FOLLOWUP__|".length);
      const sepIdx = rest.indexOf("|");
      if (sepIdx > 0) {
        // 只取 utterance 部分给用户看
        displayText = rest.slice(sepIdx + 1).trim() || text;
      }
    }

    // ============ 埋点：发送消息（核心活跃指标）============
    // 新一轮 turn_index = 当前 turnCount（已发 user msg 数）+ 1
    const newTurnIndex = turnCount + 1;
    // session 首条 = 标记 session_started，未来分析"启动率"
    if (newTurnIndex === 1) {
      track("session_started", { mode });
    }
    track("message_sent", {
      mode,
      turn_index: newTurnIndex,
      is_followup: isFollowUp,
      // 只记长度区间，不记原文（隐私保护）
      length_bucket: bucketTextLength(displayText),
    });

    // v0.4.2 预制快速路径：用户首次点击 EmptyState 9 个 tip 之一时，
    // 直接塞预制回复 + 预制 mp3，0 延迟、0 API 开销。
    // 仅在"完全空对话"状态下生效——后续追问全走真实 deepseek。
    const preset = messages.length === 0 ? findPreset(mode, text) : null;
    if (preset) {
      // 埋点：命中预制路径（说明用户点了 EmptyState 的 tip 之一 → preset 命中率）
      track("preset_tip_clicked", { mode });
      // v0.4.2.4 Bug2 修复：预制气泡逐段淡入，不再瞬间一次性出现
      //  · 第 1 段 0ms 立即显示（保留"炸裂感"，用户不必等）
      //  · 第 2 段起每段间隔 220ms 淡入（节奏自然不假）
      //  · 全程总时长 ≈ (段数-1) × 220ms（典型 4 段 = 660ms，比真 AI 快得多但不瞬出）
      const userMsg: ChatMessageItem = {
        id: uid(),
        role: "user",
        content: displayText,
        done: true,
      };
      const assistantId = uid();
      const segments = preset.reply
        .split(/\n\n+/)
        .map((s) => s.trim())
        .filter(Boolean);

      // 立刻插入用户消息 + 第一段（done=false 让光标显示）
      setMessages([
        userMsg,
        {
          id: assistantId,
          role: "assistant",
          content: segments[0] || preset.reply,
          done: segments.length <= 1,
          mode,
          presetAudio: preset.audio,
        },
      ]);

      // 后续段落逐段追加
      if (segments.length > 1) {
        for (let i = 1; i < segments.length; i++) {
          const isLast = i === segments.length - 1;
          await new Promise<void>((resolve) =>
            window.setTimeout(resolve, 220)
          );
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: m.content + "\n\n" + segments[i],
                    done: isLast,
                  }
                : m
            )
          );
        }
      }
      // 不调 deepseek、不创建 session_id（让用户第二轮起再走真实 API）
      return;
    }

    const userMsg: ChatMessageItem = {
      id: uid(),
      role: "user",
      content: displayText,
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
          message: apiText,
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
              // v0.7.9.6：12 问命中数兜底（缺失走 ?? 0，老后端不爆）
              if (typeof data.q_progress === "number") {
                setQProgress(data.q_progress);
              }
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
              // v0.7.9.6：done 事件再同步一次 q_progress（assistant 落地后命中数可能变）
              if (typeof data.q_progress === "number") {
                setQProgress(data.q_progress);
              }
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
        // 埋点：API 错误（按错误类型粗分类，用于看 deepseek 是否稳定）
        track("api_error", {
          mode,
          turn_index: newTurnIndex,
          error_type: classifyError(rawMsg),
        });
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
    <>
      <Chat
        mode={mode}
        onModeChange={handleModeChange}
        messages={messages}
        streaming={streaming}
        turnCount={turnCount}
        sendMessageWith={sendMessageWith}
        clearAll={clearAll}
        onOpenDrawer={() => setDrawerOpen(true)}
      />
      <SideDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        qProgress={qProgress}
        turnCount={turnCount}
      />
      {toastMsg ? (
        <Toast message={toastMsg} onClose={() => setToastMsg(null)} />
      ) : null}
    </>
  );
}
