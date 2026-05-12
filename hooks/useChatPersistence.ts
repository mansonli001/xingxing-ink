"use client";

/**
 * useChatPersistence · v0.7.9.3 · P4 会话持久化
 *
 * 解决问题：
 *   用户反馈"没有储存，我之前聊过的，关了，就不见了"
 *   原 ChatShell 的 messages 状态纯内存，关 tab 即失。
 *
 * 设计原则：
 *   1. TTL 7 天 —— 避免存太久过期数据（用户三个月前的对话不应该还在）
 *   2. 容量上限 50 条 —— 避免塞爆 5MB localStorage
 *   3. 隐私模式 fallback —— localStorage 不可用（无痕浏览/storage 满）时降级为内存模式，不崩溃
 *   4. 版本号 schema —— key 带 v1 后缀，将来数据结构升级可平滑迁移
 *   5. 流式恢复修复 —— 恢复时把 done:false 的 assistant 消息强制改为 done:true，
 *      避免用户刷新后看到一个永远在"打字中"的死气泡
 *
 * 不做：
 *   - 跨标签页同步（storage event）—— 过度工程
 *   - "欢迎回来"提示 —— 保持纯净，隐性恢复
 *   - 多会话切换 —— 留 v0.8.x
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessageItem } from "../components/MessageBubble";
import type { ModeId } from "../components/modeMeta";

// ============ 常量 ============

const STORAGE_KEY = "xx_chat_session_v1";
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 天
const MAX_MESSAGES = 50; // 超出丢最旧
const SCHEMA_VERSION = 1;

// ============ 数据结构 ============

export interface PersistedSession {
  v: number; // schema 版本号
  ts: number; // 写入时间戳（用于 TTL 判断）
  mode: ModeId;
  sessionId?: string;
  messages: ChatMessageItem[];
}

export interface ChatPersistenceState {
  /** 已恢复的初始数据；首次 mount 后赋值，之后不再变 */
  initial: {
    mode: ModeId;
    sessionId: string | undefined;
    messages: ChatMessageItem[];
  } | null;
  /** localStorage 是否可用 */
  storageOk: boolean;
  /** 是否已完成首次恢复（用于避免初始 effect 把空状态写回去覆盖了刚恢复的数据） */
  hydrated: boolean;
}

// ============ localStorage 安全封装 ============

function safeGet(): PersistedSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSession;
    // schema 不匹配 → 当无效（将来升级时可加迁移逻辑）
    if (!parsed || parsed.v !== SCHEMA_VERSION) return null;
    // TTL 过期 → 当无效
    if (typeof parsed.ts !== "number" || Date.now() - parsed.ts > TTL_MS) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function safeSet(data: PersistedSession): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    // 配额超出 / 隐私模式 / 其他 → 静默失败
    return false;
  }
}

function safeRemove(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function isStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const k = "__xx_test__";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

// ============ Hook ============

/**
 * 会话持久化 hook
 *
 * 用法（在 ChatShell 中）：
 *   const { initial, storageOk, hydrated, persist, clear } = useChatPersistence();
 *
 *   // 1. 首次 mount 后用 initial 恢复 useState
 *   useEffect(() => {
 *     if (initial) {
 *       setMode(initial.mode);
 *       setSessionId(initial.sessionId);
 *       setMessages(initial.messages);
 *     }
 *   }, [initial]);
 *
 *   // 2. 每次状态变化后 persist
 *   useEffect(() => {
 *     if (hydrated) persist({ mode, sessionId, messages });
 *   }, [mode, sessionId, messages, hydrated]);
 *
 *   // 3. 清空按钮触发 clear()
 */
export function useChatPersistence() {
  const [state, setState] = useState<ChatPersistenceState>({
    initial: null,
    storageOk: false,
    hydrated: false,
  });

  // 用 ref 标记是否已经 hydrate 过，避免 SSR/CSR 不一致
  const hydratedRef = useRef(false);

  // 首次 mount：检查 storage 可用性 + 读取已存数据
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const ok = isStorageAvailable();
    const stored = ok ? safeGet() : null;

    if (stored) {
      // 流式恢复修复：把所有 done:false 强制改为 done:true，避免死气泡
      const fixedMessages = stored.messages.map((m) =>
        m.done === false ? { ...m, done: true } : m
      );

      setState({
        initial: {
          mode: stored.mode,
          sessionId: stored.sessionId,
          messages: fixedMessages,
        },
        storageOk: true,
        hydrated: true,
      });
    } else {
      setState({
        initial: null,
        storageOk: ok,
        hydrated: true,
      });
    }
  }, []);

  /**
   * 写入 localStorage（带容量上限）
   * 调用方需保证只在 hydrated=true 后才调用，避免覆盖刚恢复的数据
   */
  const persist = useCallback(
    (snapshot: {
      mode: ModeId;
      sessionId: string | undefined;
      messages: ChatMessageItem[];
    }) => {
      if (!state.storageOk) return;

      // 空状态不写（避免清空后立刻又写一次空数据）
      if (snapshot.messages.length === 0 && !snapshot.sessionId) {
        safeRemove();
        return;
      }

      // 容量上限：超出丢最旧（保留最后 N 条）
      const trimmed =
        snapshot.messages.length > MAX_MESSAGES
          ? snapshot.messages.slice(-MAX_MESSAGES)
          : snapshot.messages;

      safeSet({
        v: SCHEMA_VERSION,
        ts: Date.now(),
        mode: snapshot.mode,
        sessionId: snapshot.sessionId,
        messages: trimmed,
      });
    },
    [state.storageOk]
  );

  /** 清空持久化数据（清空按钮调用） */
  const clear = useCallback(() => {
    safeRemove();
  }, []);

  return {
    initial: state.initial,
    storageOk: state.storageOk,
    hydrated: state.hydrated,
    persist,
    clear,
  };
}
