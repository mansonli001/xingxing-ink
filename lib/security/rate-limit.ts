/**
 * 醒醒 · 通用限流模块（v0.7.9.7.8 安全 P0）
 *
 * 用途：保护昂贵 API（DeepSeek 计费流式接口）不被同 IP/同 session 爆刷。
 *
 * 设计原则：
 *   1. 内存级 Map 计数（每个 edge 实例独立，已经足够阻击普通爆刷）
 *   2. 双维度独立判定：IP 维（防同 IP 多 session 轰炸）+ sessionId 维（防同 session 反复重试）
 *   3. 自动清理过期窗口的 key，防内存泄漏
 *   4. Edge 兼容（不依赖 node:crypto / fs）
 *   5. 复用 admin-auth.ts 同款 getClientIp 提取逻辑（共享 IP 兼容性 = Vercel x-forwarded-for）
 *
 * 阈值依据（参考 lib/stats/kv.ts 容量预估「访客 200 × 5 轮 = 1000 写/天」）：
 *   - IP 维：30 次/小时 — 正常用户 5-6 轮对话（含 Coffee Break 多轮追问）富余 5 倍
 *   - sessionId 维：200 条/天 — 极端长聊也够，封堵无限重发
 *
 * 触发：返回 429 + Retry-After header + 友好 JSON
 */

// =========================================================================
// IP 提取（与 lib/stats/admin-auth.ts 对齐）
// =========================================================================

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") || "";
  const ip =
    fwd.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return ip;
}

// =========================================================================
// 内存计数器（双维度独立）
// =========================================================================

/** IP 维：key = `${ip}:${hourBucket}` */
const ipHourMap = new Map<string, number>();
/** sessionId 维：key = `${sid}:${dayBucket}` */
const sidDayMap = new Map<string, number>();

const IP_LIMIT_PER_HOUR = 30;
const SID_LIMIT_PER_DAY = 200;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// =========================================================================
// 窗口计算 + 自动 GC
// =========================================================================

function currentHourBucket(): number {
  return Math.floor(Date.now() / HOUR_MS);
}

function currentDayBucket(): number {
  return Math.floor(Date.now() / DAY_MS);
}

/**
 * 清理 cutoff 之前的旧 key（防内存无限增长）
 * 每次 check 时跑一次，O(n) 但 n 通常很小（活跃用户 ≤ 几百）
 */
function gcMap(map: Map<string, number>, currentBucket: number, keepBuckets: number) {
  const cutoff = currentBucket - keepBuckets;
  for (const k of Array.from(map.keys())) {
    const bucketStr = k.split(":").pop();
    if (bucketStr && Number(bucketStr) < cutoff) {
      map.delete(k);
    }
  }
}

// =========================================================================
// 公共 API
// =========================================================================

export type ChatRateLimitResult =
  | { ok: true }
  | {
      ok: false;
      reason: "ip_hour_exceeded" | "sid_day_exceeded";
      retryAfterSeconds: number;
    };

/**
 * Chat Stream 限流检查
 *
 * 调用时机：每次 POST /api/chat/stream 入口
 *
 * @param req       Next.js Request（用于提取 IP）
 * @param sessionId 会话 ID（来自请求体或 session cookie；可选 — 缺省时跳过 sid 维）
 * @returns         ok=true 通过；ok=false 表示需要返回 429
 */
export function checkChatRateLimit(
  req: Request,
  sessionId?: string
): ChatRateLimitResult {
  const ip = getClientIp(req);

  // ---- 维度 1：IP 小时限流 ----
  const hourBucket = currentHourBucket();
  const ipKey = `${ip}:${hourBucket}`;
  const ipCount = (ipHourMap.get(ipKey) || 0) + 1;
  ipHourMap.set(ipKey, ipCount);
  gcMap(ipHourMap, hourBucket, 2); // 保留近 2 小时

  if (ipCount > IP_LIMIT_PER_HOUR) {
    // 距下个整点还差多少秒
    const nextHour = (hourBucket + 1) * HOUR_MS;
    const retryAfterSeconds = Math.ceil((nextHour - Date.now()) / 1000);
    return {
      ok: false,
      reason: "ip_hour_exceeded",
      retryAfterSeconds: Math.max(60, retryAfterSeconds),
    };
  }

  // ---- 维度 2：sessionId 日限流（可选）----
  if (sessionId) {
    const dayBucket = currentDayBucket();
    const sidKey = `${sessionId}:${dayBucket}`;
    const sidCount = (sidDayMap.get(sidKey) || 0) + 1;
    sidDayMap.set(sidKey, sidCount);
    gcMap(sidDayMap, dayBucket, 2); // 保留近 2 天

    if (sidCount > SID_LIMIT_PER_DAY) {
      const nextDay = (dayBucket + 1) * DAY_MS;
      const retryAfterSeconds = Math.ceil((nextDay - Date.now()) / 1000);
      return {
        ok: false,
        reason: "sid_day_exceeded",
        retryAfterSeconds: Math.max(3600, retryAfterSeconds),
      };
    }
  }

  return { ok: true };
}

// =========================================================================
// 测试辅助（仅 NODE_ENV=test 下导出，避免污染生产）
// =========================================================================

/** @internal 仅供单测用，重置内存计数 */
export function __resetForTest__() {
  ipHourMap.clear();
  sidDayMap.clear();
}

/** @internal 仅供单测/监控用，读取当前 IP 已用次数 */
export function __peekIpHourCount__(ip: string): number {
  return ipHourMap.get(`${ip}:${currentHourBucket()}`) || 0;
}
