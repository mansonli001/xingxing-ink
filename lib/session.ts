/**
 * 会话管理模块（MVP：内存存储）
 * - 单实例进程内有效
 * - Vercel Serverless 冷启动会丢失，但 MVP 不持久化历史，可接受
 * - 后续接 Supabase 只需替换 store 实现
 */

import type { ChatMessage } from "./deepseek";
import type { ModeId } from "./prompts";

export interface SessionState {
  id: string;
  mode: ModeId;
  history: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

const store = new Map<string, SessionState>();
const MAX_HISTORY = 20; // 最近 20 条
const SESSION_TTL = 1000 * 60 * 60 * 2; // 2 小时

function gc() {
  const now = Date.now();
  for (const [id, s] of store) {
    if (now - s.updatedAt > SESSION_TTL) store.delete(id);
  }
}

export function generateSessionId(): string {
  return `sess_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export function createSession(mode: ModeId): SessionState {
  gc();
  const id = generateSessionId();
  const session: SessionState = {
    id,
    mode,
    history: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  store.set(id, session);
  return session;
}

export function getSession(id: string): SessionState | null {
  gc();
  return store.get(id) || null;
}

export function getOrCreateSession(
  id: string | undefined,
  mode: ModeId
): { session: SessionState; modeChanged: boolean } {
  if (id) {
    const existing = store.get(id);
    if (existing) {
      const modeChanged = existing.mode !== mode;
      if (modeChanged) existing.mode = mode;
      existing.updatedAt = Date.now();
      return { session: existing, modeChanged };
    }
  }
  return { session: createSession(mode), modeChanged: false };
}

export function appendMessage(
  sessionId: string,
  message: ChatMessage
): SessionState | null {
  const s = store.get(sessionId);
  if (!s) return null;
  s.history.push(message);
  if (s.history.length > MAX_HISTORY) {
    s.history = s.history.slice(-MAX_HISTORY);
  }
  s.updatedAt = Date.now();
  return s;
}
