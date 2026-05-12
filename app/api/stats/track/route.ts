/**
 * POST /api/stats/track
 *
 * 前端埋点事件接收端（自建 KV 统计入口）
 *
 * 接收事件类型：
 *   - session_start     — 第一次发消息（session_started）
 *   - session_cleared   — 清空重开
 *   - message_sent      — 发了一条消息（含 turn_index）
 *   - followup_clicked  — 点追问
 *   - preset_clicked    — 命中预制
 *   - mode_selected     — 切换三档
 *   - intro_played      — 看完开场
 *   - intro_skipped     — 跳过开场
 *   - api_error         — DeepSeek 失败
 *   - heartbeat         — 30s 一次，续约在线标记
 *
 * 设计要点：
 *   - fire-and-forget：前端 sendBeacon 送过来，从不等待响应
 *   - 任何单个 KV 命令失败都 catch 掉，绝不抛 500（前端永远不重试）
 *   - 不校验身份（反正是匿名埋点，伪造数据收益为零）
 */
import { NextResponse } from "next/server";
import { getClient, dayKey } from "@/lib/stats/kv";
import {
  K_TOTAL_SESSIONS,
  K_TOTAL_ROUNDS,
  K_TOTAL_PRESETS,
  K_TOTAL_FOLLOWUPS,
  K_TOTAL_ERRORS,
  K_TOTAL_INTRO_PLAYED,
  K_TOTAL_INTRO_SKIPPED,
  K_TOTAL_CLEARED,
  K_VISITORS_SET,
  K_MODE_CASUAL,
  K_MODE_RATIONAL,
  K_MODE_SCATHING,
  K_MAX_ROUNDS,
  K_ERROR_BY,
  K_TURN_REACHED,
  K_LEN_BUCKET,
  K_DAILY_VISITORS_SET,
  K_DAILY_SESSIONS,
  K_DAILY_ROUNDS,
  K_DAILY_ERRORS,
  K_DAILY_FOLLOWUPS,
  K_DAILY_MODE,
  K_ONLINE_SESSION,
  ONLINE_TTL_SECONDS,
  DAILY_KEY_TTL_SECONDS,
  VISITORS_SET_TTL_SECONDS,
} from "@/lib/stats/keys";

export const runtime = "edge";

// ----------------------------------------
// 事件类型
// ----------------------------------------
type TrackEvent =
  | "session_start"
  | "session_cleared"
  | "message_sent"
  | "followup_clicked"
  | "preset_clicked"
  | "mode_selected"
  | "intro_played"
  | "intro_skipped"
  | "api_error"
  | "heartbeat";

type TrackPayload = {
  event: TrackEvent;
  sessionId?: string;
  mode?: "casual" | "rational" | "scathing";
  turnIndex?: number;
  lengthBucket?: "xs" | "s" | "m" | "l" | "xl";
  errorType?: string;
  isFollowup?: boolean;
};

// ----------------------------------------
// 工具：mode → 键名
// ----------------------------------------
function modeKey(mode?: string): string | null {
  if (mode === "casual") return K_MODE_CASUAL;
  if (mode === "rational") return K_MODE_RATIONAL;
  if (mode === "scathing") return K_MODE_SCATHING;
  return null;
}

// ----------------------------------------
// 主处理
// ----------------------------------------
export async function POST(req: Request) {
  let body: TrackPayload;
  try {
    body = (await req.json()) as TrackPayload;
  } catch {
    return NextResponse.json({ ok: false, err: "bad_json" }, { status: 400 });
  }

  const { event, sessionId, mode, turnIndex, lengthBucket, errorType } = body;
  if (!event) {
    return NextResponse.json({ ok: false, err: "no_event" }, { status: 400 });
  }

  const today = dayKey();

  try {
    const kv = await getClient();

    // 并行执行所有命令，某一条失败不影响其他
    const tasks: Promise<unknown>[] = [];
    const safe = (p: Promise<unknown>) => tasks.push(p.catch(() => null));

    switch (event) {
      // ==================================================
      // 开聊（第一次 message_sent 时前端会先打这个）
      // ==================================================
      case "session_start": {
        safe(kv.incr(K_TOTAL_SESSIONS));
        safe(kv.incr(K_DAILY_SESSIONS(today)));
        safe(kv.expire(K_DAILY_SESSIONS(today), DAILY_KEY_TTL_SECONDS));
        // UV 去重
        if (sessionId) {
          safe(kv.sadd(K_VISITORS_SET, sessionId));
          safe(kv.expire(K_VISITORS_SET, VISITORS_SET_TTL_SECONDS));
          safe(kv.sadd(K_DAILY_VISITORS_SET(today), sessionId));
          safe(kv.expire(K_DAILY_VISITORS_SET(today), DAILY_KEY_TTL_SECONDS));
        }
        // mode 分布（以开聊时的 mode 为准）
        const mk = modeKey(mode);
        if (mk) {
          safe(kv.incr(mk));
          safe(kv.incr(K_DAILY_MODE(today, mode!)));
          safe(kv.expire(K_DAILY_MODE(today, mode!), DAILY_KEY_TTL_SECONDS));
        }
        break;
      }

      // ==================================================
      // 每发一条消息 + 在线心跳
      // ==================================================
      case "message_sent": {
        safe(kv.incr(K_TOTAL_ROUNDS));
        safe(kv.incr(K_DAILY_ROUNDS(today)));
        safe(kv.expire(K_DAILY_ROUNDS(today), DAILY_KEY_TTL_SECONDS));
        // 轮次漏斗：第 N 轮有多少 session 达到（按 session 去重）
        if (typeof turnIndex === "number" && turnIndex > 0 && sessionId) {
          // 用 set 去重：stats:turn:reached:3 → session ids
          safe(kv.sadd(K_TURN_REACHED(turnIndex), sessionId));
          safe(kv.expire(K_TURN_REACHED(turnIndex), VISITORS_SET_TTL_SECONDS));
        }
        // 长度分布
        if (lengthBucket) {
          safe(kv.incr(K_LEN_BUCKET(lengthBucket)));
        }
        // max rounds
        if (typeof turnIndex === "number") {
          safe(kv.setMax(K_MAX_ROUNDS, turnIndex));
        }
        // 续约在线
        if (sessionId) {
          safe(
            kv.set(K_ONLINE_SESSION(sessionId), 1, {
              ex: ONLINE_TTL_SECONDS,
            })
          );
        }
        break;
      }

      // ==================================================
      // 30s 一次的在线心跳（静默事件，只续约 TTL）
      // ==================================================
      case "heartbeat": {
        if (sessionId) {
          safe(
            kv.set(K_ONLINE_SESSION(sessionId), 1, {
              ex: ONLINE_TTL_SECONDS,
            })
          );
        }
        break;
      }

      // ==================================================
      // 追问 / 预制 / 清空
      // ==================================================
      case "followup_clicked": {
        safe(kv.incr(K_TOTAL_FOLLOWUPS));
        safe(kv.incr(K_DAILY_FOLLOWUPS(today)));
        safe(kv.expire(K_DAILY_FOLLOWUPS(today), DAILY_KEY_TTL_SECONDS));
        break;
      }
      case "preset_clicked": {
        safe(kv.incr(K_TOTAL_PRESETS));
        break;
      }
      case "session_cleared": {
        safe(kv.incr(K_TOTAL_CLEARED));
        break;
      }

      // ==================================================
      // 切换三档（未开聊前）
      // ==================================================
      case "mode_selected": {
        // 仅记录用户最终选的 mode 时计一次（避免切来切去刷数）
        // 这里不计数，交给 session_start 时按 mode 记
        break;
      }

      // ==================================================
      // 开场动画
      // ==================================================
      case "intro_played": {
        safe(kv.incr(K_TOTAL_INTRO_PLAYED));
        break;
      }
      case "intro_skipped": {
        safe(kv.incr(K_TOTAL_INTRO_SKIPPED));
        break;
      }

      // ==================================================
      // 错误
      // ==================================================
      case "api_error": {
        safe(kv.incr(K_TOTAL_ERRORS));
        safe(kv.incr(K_DAILY_ERRORS(today)));
        safe(kv.expire(K_DAILY_ERRORS(today), DAILY_KEY_TTL_SECONDS));
        if (errorType) safe(kv.incr(K_ERROR_BY(errorType)));
        break;
      }

      default:
        break;
    }

    // 不 await 全部完成——尽量快返回让前端 sendBeacon 不阻塞
    // 但 edge runtime 若提前返回可能中断 pending promise，所以还是等一下
    await Promise.allSettled(tasks);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    // 任何未捕获错误：静默成功，绝不让埋点影响用户
    return NextResponse.json({ ok: true, soft: 1 }, { status: 200 });
  }
}
