/**
 * 醒醒 · 用户行为埋点（v0.7.9.1）
 *
 * 设计原则：
 * 1. 只记事件 + 维度，不记对话内容（隐私保护）
 * 2. 基于 @vercel/analytics/track，免费版可用，0 配置
 * 3. SSR 安全：所有 window/sessionStorage 访问都加 typeof window 守卫
 * 4. 不阻断主流程：track 失败永远不抛错
 *
 * 看板路径：Vercel Dashboard → xingxing-ink → Analytics → Events
 */

import { track as vercelTrack } from "@vercel/analytics";

/** 所有事件名集中收口，命名约定：snake_case */
export type AnalyticsEvent =
  // 一进站
  | "intro_played" //          开场动画播完（用户看完 4 句"我觉得"）
  | "intro_skipped" //         开场动画被跳过（按钮/键盘/点击）
  // 入场会话
  | "session_started" //       第一次发出消息，正式开聊（核心活跃指标）
  | "session_cleared" //       清空重开
  // 互动
  | "mode_selected" //         用户切换人格档（casual/rational/scathing）
  | "preset_tip_clicked" //    点了 EmptyState 的示例 tip 一键发送
  | "message_sent" //          发了一条消息（含每轮 turn_index）
  | "followup_clicked" //      点了「追问这一段」
  // 异常
  | "api_error"; //            调 deepseek 接口失败

/** 事件载荷，按事件类型缩窄；undefined 字段 Vercel 会自动忽略 */
type EventPayload = Record<string, string | number | boolean | undefined>;

/** 当前会话 sessionId（仅当前 tab，刷新即重置）— 用于把同一次访问的事件串起来 */
let cachedSessionId: string | null = null;

function getSessionId(): string {
  if (cachedSessionId) return cachedSessionId;
  if (typeof window === "undefined") return "ssr";

  try {
    const KEY = "xx_session_id";
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id = `s_${Date.now().toString(36)}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      sessionStorage.setItem(KEY, id);
    }
    cachedSessionId = id;
    return id;
  } catch {
    // 隐私模式 / sessionStorage 不可用
    cachedSessionId = `s_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    return cachedSessionId;
  }
}

/**
 * 统一埋点入口
 *
 * 用法：
 *   track("session_started", { mode: "scathing" });
 *   track("message_sent", { mode, turn_index: 3 });
 *
 * 注意：
 * - 不要传任何用户对话原文，违反隐私边界
 * - 维度值不要超过 100 字符（Vercel 限制）
 */
export function track(event: AnalyticsEvent, props?: EventPayload): void {
  if (typeof window === "undefined") return;

  try {
    const sessionId = getSessionId();
    const payload: EventPayload = {
      session_id: sessionId,
      ts: Date.now(),
      ...props,
    };
    // 过滤 undefined（Vercel track 不接受 undefined）
    const clean: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(payload)) {
      if (v !== undefined && v !== null) clean[k] = v;
    }
    vercelTrack(event, clean);
  } catch {
    // 永远不让埋点中断主流程
  }
}
