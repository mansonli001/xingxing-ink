/**
 * 诊断书生成专用限流器 · v0.7.11
 *
 * 为什么单独做：
 *   chat 一次 ~200 tokens，诊断书一次 ~2500 tokens（10 倍贵）
 *   所以诊断书的限流要比 chat 严格 6 倍
 *
 * 阈值：
 *   - IP 维：5 次/小时（防同 IP 多 session 反复刷）
 *   - sessionId 维：3 次/天（防同对话反复点出诊断书）
 *
 * 复用 lib/security/rate-limit.ts 的 getClientIp
 */

import { getClientIp } from "./rate-limit";

const ipHourMap = new Map<string, number>();
const sidDayMap = new Map<string, number>();

const IP_LIMIT_PER_HOUR = 5;
const SID_LIMIT_PER_DAY = 3;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function currentHourBucket(): number {
  return Math.floor(Date.now() / HOUR_MS);
}
function currentDayBucket(): number {
  return Math.floor(Date.now() / DAY_MS);
}

function gcMap(
  map: Map<string, number>,
  currentBucket: number,
  keepBuckets: number
) {
  const cutoff = currentBucket - keepBuckets;
  for (const k of Array.from(map.keys())) {
    const bucketStr = k.split(":").pop();
    if (bucketStr && Number(bucketStr) < cutoff) {
      map.delete(k);
    }
  }
}

export type DiagnosisRateLimitResult =
  | { ok: true }
  | {
      ok: false;
      reason: "ip_hour_exceeded" | "sid_day_exceeded";
      retryAfterSeconds: number;
      message: string;
    };

export function checkDiagnosisRateLimit(
  req: Request,
  sessionId?: string
): DiagnosisRateLimitResult {
  const ip = getClientIp(req);

  const hourBucket = currentHourBucket();
  const ipKey = `${ip}:${hourBucket}`;
  const ipCount = (ipHourMap.get(ipKey) || 0) + 1;
  ipHourMap.set(ipKey, ipCount);
  gcMap(ipHourMap, hourBucket, 2);

  if (ipCount > IP_LIMIT_PER_HOUR) {
    const nextHour = (hourBucket + 1) * HOUR_MS;
    const retryAfterSeconds = Math.ceil((nextHour - Date.now()) / 1000);
    return {
      ok: false,
      reason: "ip_hour_exceeded",
      retryAfterSeconds: Math.max(60, retryAfterSeconds),
      message: "醒醒今天给你看够了，等下个小时再来。",
    };
  }

  if (sessionId) {
    const dayBucket = currentDayBucket();
    const sidKey = `${sessionId}:${dayBucket}`;
    const sidCount = (sidDayMap.get(sidKey) || 0) + 1;
    sidDayMap.set(sidKey, sidCount);
    gcMap(sidDayMap, dayBucket, 2);

    if (sidCount > SID_LIMIT_PER_DAY) {
      const nextDay = (dayBucket + 1) * DAY_MS;
      const retryAfterSeconds = Math.ceil((nextDay - Date.now()) / 1000);
      return {
        ok: false,
        reason: "sid_day_exceeded",
        retryAfterSeconds: Math.max(3600, retryAfterSeconds),
        message: "这场对话已经看过 3 次诊断书了，新开一场再聊吧。",
      };
    }
  }

  return { ok: true };
}
