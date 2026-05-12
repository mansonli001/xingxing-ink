/**
 * 醒醒 · 后台鉴权 4 层防护
 *
 * 设计目标：只有你一个人能看后台，防暴力破解 + 防泄露 URL
 *
 * 4 层防护：
 *   1. ADMIN_KEY 强制检查（必须配置，默认值不允许在生产生效）
 *   2. 时间安全比较（timing-safe，防时序攻击）
 *   3. IP 白名单（可选，环境变量 ADMIN_IP_ALLOWLIST，逗号分隔）
 *   4. 简易速率限制（单 IP 每分钟最多 10 次尝试，防暴破）
 *
 * 环境变量（Vercel Settings → Environment Variables）：
 *   ADMIN_KEY            —— 强随机串，必填，≥16 位
 *   ADMIN_IP_ALLOWLIST   —— 可选，例 "1.2.3.4,5.6.7.8"；不设=不限制 IP
 *   ADMIN_STRICT         —— 可选，"1" 时强制要求 key 长度≥16 和 IP 白名单命中
 */

// Edge runtime 兼容（用不到 node:crypto）
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// 简易内存速率限制（每个 edge 实例独立，已经足够阻击暴破）
// key: `${ip}:${minute}` → count
const rateMap = new Map<string, number>();
const RATE_LIMIT_PER_MIN = 10;

function getClientIp(req: Request): string {
  // Vercel 会设置 x-forwarded-for，第一个 IP 是真实客户端
  const fwd = req.headers.get("x-forwarded-for") || "";
  const ip = fwd.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  return ip;
}

function rateLimitBlocked(ip: string): boolean {
  const minute = Math.floor(Date.now() / 60_000);
  const key = `${ip}:${minute}`;
  const count = (rateMap.get(key) || 0) + 1;
  rateMap.set(key, count);

  // 清理上一分钟前的条目（避免内存无限增长）
  const cutoff = minute - 2;
  for (const k of Array.from(rateMap.keys())) {
    const mStr = k.split(":").pop();
    if (mStr && Number(mStr) < cutoff) rateMap.delete(k);
  }

  return count > RATE_LIMIT_PER_MIN;
}

export type AuthResult =
  | { ok: true }
  | { ok: false; reason: "misconfigured" | "rate_limited" | "ip_blocked" | "bad_key"; status: number };

export function checkAdminAuth(req: Request, providedKey: string): AuthResult {
  // ---- 层 1：ADMIN_KEY 必须配置 ----
  const expected = process.env.ADMIN_KEY || "";
  const strict = process.env.ADMIN_STRICT === "1";

  // 生产环境没配 ADMIN_KEY 或仍为 dev 默认值 → 禁止访问
  const isProd = process.env.VERCEL_ENV === "production";
  if (isProd && (!expected || expected === "xingxing-dev")) {
    return { ok: false, reason: "misconfigured", status: 503 };
  }
  // strict 模式要求密钥≥16 位
  if (strict && expected.length < 16) {
    return { ok: false, reason: "misconfigured", status: 503 };
  }

  const ip = getClientIp(req);

  // ---- 层 4：速率限制（最先检查，避免大量无效 key 尝试触发昂贵比较）----
  if (rateLimitBlocked(ip)) {
    return { ok: false, reason: "rate_limited", status: 429 };
  }

  // ---- 层 3：IP 白名单（可选）----
  const allowlistRaw = process.env.ADMIN_IP_ALLOWLIST || "";
  const allowlist = allowlistRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowlist.length > 0 && !allowlist.includes(ip)) {
    return { ok: false, reason: "ip_blocked", status: 403 };
  }
  // strict 模式要求必须配白名单
  if (strict && allowlist.length === 0) {
    return { ok: false, reason: "misconfigured", status: 503 };
  }

  // ---- 层 2：时间安全比较 key ----
  // 开发环境允许 "xingxing-dev"，生产环境 expected 必须是强随机
  const devFallback = isProd ? "" : "xingxing-dev";
  const effectiveExpected = expected || devFallback;
  if (!effectiveExpected) {
    return { ok: false, reason: "misconfigured", status: 503 };
  }
  if (!timingSafeEqual(providedKey, effectiveExpected)) {
    return { ok: false, reason: "bad_key", status: 401 };
  }

  return { ok: true };
}
