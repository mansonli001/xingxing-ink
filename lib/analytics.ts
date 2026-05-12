/**
 * 醒醒 · 用户行为埋点（v0.7.9.2 双写版）
 *
 * 设计原则：
 * 1. 只记事件 + 维度，不记对话内容（隐私保护）
 * 2. 双写策略：
 *    a) @vercel/analytics/track —— 保留，Vercel Pro 后可启用看板
 *    b) /api/stats/track       —— v0.7.9.2 新增，写自建 KV，主页 + 后台都读这里
 * 3. SSR 安全：所有 window/sessionStorage 访问都加 typeof window 守卫
 * 4. 不阻断主流程：track 失败永远不抛错
 * 5. 前端用 sendBeacon 发送自建 KV（即使页面关闭也能送达）
 *
 * 看板路径：
 *   - 公开主页：xingxing.starfluxes.com（StatsBanner 拉 /api/stats/summary）
 *   - 后台私密：/admin?key=XXX
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
  | "session_restored" //      v0.7.9.3 P4：从 localStorage 恢复历史会话（看持久化命中率）
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

  // ============ v0.7.9.2 新增：并行写自建 KV ============
  try {
    trackToKv(event, props);
  } catch {
    // 永远不让自建埋点中断主流程
  }
}

// ============================================================
// v0.7.9.2: 自建 KV 上报
// 用 sendBeacon 优先（页面关闭也能送达），fallback fetch
// ============================================================

/** 把 Vercel 事件名映射到自建 KV 事件名 */
function mapToKvEvent(event: AnalyticsEvent): string | null {
  switch (event) {
    case "intro_played":
      return "intro_played";
    case "intro_skipped":
      return "intro_skipped";
    case "session_started":
      return "session_start"; // 命名对齐后端
    case "session_cleared":
      return "session_cleared";
    case "session_restored":
      return "session_restored";
    case "mode_selected":
      return "mode_selected";
    case "preset_tip_clicked":
      return "preset_clicked";
    case "message_sent":
      return "message_sent";
    case "followup_clicked":
      return "followup_clicked";
    case "api_error":
      return "api_error";
    default:
      return null;
  }
}

function trackToKv(event: AnalyticsEvent, props?: EventPayload): void {
  const kvEvent = mapToKvEvent(event);
  if (!kvEvent) return;

  const sessionId = getSessionId();
  const body = JSON.stringify({
    event: kvEvent,
    sessionId,
    mode: props?.mode,
    turnIndex: props?.turn_index,
    lengthBucket: props?.length_bucket,
    errorType: props?.error_type,
    isFollowup: props?.is_followup,
  });

  postToTrackEndpoint(body);
}

/**
 * 发送到 /api/stats/track
 * 优先 navigator.sendBeacon（关闭页面也能送，不阻塞）
 * fallback fetch({ keepalive: true })
 */
function postToTrackEndpoint(body: string): void {
  if (typeof window === "undefined") return;

  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      const ok = navigator.sendBeacon("/api/stats/track", blob);
      if (ok) return;
    }
  } catch {
    // 忽略，走 fetch
  }

  try {
    // fetch fallback · keepalive 让页面关闭也能完成
    fetch("/api/stats/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      /* 静默 */
    });
  } catch {
    // 静默失败，绝不影响主流程
  }
}

/**
 * 发送心跳（在线状态续约）
 * 与普通 track 不走同一条路——独立函数，方便 ChatShell 定时调用
 */
export function sendHeartbeat(): void {
  if (typeof window === "undefined") return;
  try {
    const sessionId = getSessionId();
    const body = JSON.stringify({
      event: "heartbeat",
      sessionId,
    });
    postToTrackEndpoint(body);
  } catch {
    // 静默
  }
}

/** 导出 getSessionId 供其他地方（如 StatsBanner）使用 */
export { getSessionId };
