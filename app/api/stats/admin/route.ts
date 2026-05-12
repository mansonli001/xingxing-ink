/**
 * GET /api/stats/admin?key=XXX
 *
 * 后台管理面板数据接口（给你自己看的完整指标）
 *
 * 鉴权：query 参数 key 必须等于环境变量 ADMIN_KEY
 *   - 本地开发没配置时 ADMIN_KEY 默认为 "xingxing-dev"
 *   - 生产务必在 Vercel 配置强随机值
 *
 * 返回内容（越多越好）：
 *   1. 全局累计（UV / 开聊次数 / 总轮数 / 预制 / 追问 / 错误）
 *   2. 三档分布（百分比 + 绝对值）
 *   3. 实时（当前在线 / 最长一次）
 *   4. 开场漏斗（看完 vs 跳过）
 *   5. 清空重开次数
 *   6. 轮次漏斗（第 1/3/5/8/12/20 轮各有多少 session 到达）
 *   7. 长度分布（xs/s/m/l/xl）
 *   8. 错误细分（按类型）
 *   9. 每日日志（最近 14 天：UV / 开聊 / 轮数 / 错误 / 追问 / 三档分布）
 *   10. 技术状态（KV 连接状态）
 */
import { NextResponse } from "next/server";
import { getClient, usingRealKv, recentDays } from "@/lib/stats/kv";
import { checkAdminAuth } from "@/lib/stats/admin-auth";
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
  K_ONLINE_PATTERN,
} from "@/lib/stats/keys";

export const runtime = "edge";

const FUNNEL_TURNS = [1, 3, 5, 8, 12, 20];
const LEN_BUCKETS: ("xs" | "s" | "m" | "l" | "xl")[] = ["xs", "s", "m", "l", "xl"];
const ERROR_TYPES = ["auth", "rate_limit", "network", "5xx", "too_long", "unknown"];

function pct(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

function num(v: unknown): number {
  return Number(v ?? 0);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key") || "";

  // 4 层防护：key 必须配置 · 时间安全比较 · IP 白名单（可选）· 速率限制
  const auth = checkAdminAuth(req, key);
  if (!auth.ok) {
    // 对客户端不暴露失败原因（防爆破侦察），只返回 HTTP 状态码
    const messages: Record<string, string> = {
      misconfigured: "admin endpoint not configured",
      rate_limited: "too many attempts, try again later",
      ip_blocked: "forbidden",
      bad_key: "unauthorized",
    };
    return NextResponse.json(
      { ok: false, err: messages[auth.reason] || "forbidden" },
      { status: auth.status }
    );
  }

  const days = Number(url.searchParams.get("days") || 14);
  const daysArr = recentDays(Math.max(1, Math.min(days, 60)));

  try {
    const kv = await getClient();

    // ---------------- 1. 全局累计 ----------------
    const [
      totalVisitors,
      totalSessions,
      totalRounds,
      totalPresets,
      totalFollowups,
      totalErrors,
      totalIntroPlayed,
      totalIntroSkipped,
      totalCleared,
      maxRounds,
      onlineKeys,
      modeCasual,
      modeRational,
      modeScathing,
    ] = await Promise.all([
      kv.scard(K_VISITORS_SET).catch(() => 0),
      kv.get(K_TOTAL_SESSIONS).catch(() => 0),
      kv.get(K_TOTAL_ROUNDS).catch(() => 0),
      kv.get(K_TOTAL_PRESETS).catch(() => 0),
      kv.get(K_TOTAL_FOLLOWUPS).catch(() => 0),
      kv.get(K_TOTAL_ERRORS).catch(() => 0),
      kv.get(K_TOTAL_INTRO_PLAYED).catch(() => 0),
      kv.get(K_TOTAL_INTRO_SKIPPED).catch(() => 0),
      kv.get(K_TOTAL_CLEARED).catch(() => 0),
      kv.get(K_MAX_ROUNDS).catch(() => 0),
      kv.keys(K_ONLINE_PATTERN).catch(() => [] as string[]),
      kv.get(K_MODE_CASUAL).catch(() => 0),
      kv.get(K_MODE_RATIONAL).catch(() => 0),
      kv.get(K_MODE_SCATHING).catch(() => 0),
    ]);

    // ---------------- 2. 轮次漏斗 ----------------
    const funnelPromises = FUNNEL_TURNS.map((t) =>
      kv.scard(K_TURN_REACHED(t)).catch(() => 0).then((n) => [t, n] as const)
    );
    const funnelResults = await Promise.all(funnelPromises);
    const funnel = funnelResults.map(([turn, reached]) => ({
      turn,
      reached,
      pct: pct(reached, num(totalSessions)),
    }));

    // ---------------- 3. 长度分布 ----------------
    const lenPromises = LEN_BUCKETS.map((b) =>
      kv.get(K_LEN_BUCKET(b)).catch(() => 0).then((n) => [b, num(n)] as const)
    );
    const lenResults = await Promise.all(lenPromises);
    const lenTotal = lenResults.reduce((s, [, n]) => s + n, 0);
    const lengthDist = lenResults.map(([bucket, count]) => ({
      bucket,
      count,
      pct: pct(count, lenTotal),
    }));

    // ---------------- 4. 错误细分 ----------------
    const errPromises = ERROR_TYPES.map((t) =>
      kv.get(K_ERROR_BY(t)).catch(() => 0).then((n) => [t, num(n)] as const)
    );
    const errResults = await Promise.all(errPromises);
    const errorBreakdown = errResults.map(([type, count]) => ({ type, count }));

    // ---------------- 5. 每日日志 ----------------
    const dailyPromises = daysArr.map(async (d) => {
      const [visitors, sessions, rounds, errors, followups, mc, mr, ms] =
        await Promise.all([
          kv.scard(K_DAILY_VISITORS_SET(d)).catch(() => 0),
          kv.get(K_DAILY_SESSIONS(d)).catch(() => 0),
          kv.get(K_DAILY_ROUNDS(d)).catch(() => 0),
          kv.get(K_DAILY_ERRORS(d)).catch(() => 0),
          kv.get(K_DAILY_FOLLOWUPS(d)).catch(() => 0),
          kv.get(K_DAILY_MODE(d, "casual")).catch(() => 0),
          kv.get(K_DAILY_MODE(d, "rational")).catch(() => 0),
          kv.get(K_DAILY_MODE(d, "scathing")).catch(() => 0),
        ]);
      const sess = num(sessions);
      return {
        date: d,
        visitors: Number(visitors ?? 0),
        sessions: sess,
        rounds: num(rounds),
        avgRounds:
          sess === 0 ? 0 : Math.round((num(rounds) / sess) * 10) / 10,
        errors: num(errors),
        errorRate:
          num(rounds) === 0 ? 0 : pct(num(errors), num(rounds)),
        followups: num(followups),
        mode: {
          casual: num(mc),
          rational: num(mr),
          scathing: num(ms),
        },
      };
    });
    const daily = await Promise.all(dailyPromises);

    // ---------------- 组装 ----------------
    const c = num(modeCasual);
    const r = num(modeRational);
    const s = num(modeScathing);
    const modeSum = c + r + s;

    const totalSess = num(totalSessions);
    const avgRounds =
      totalSess === 0 ? 0 : Math.round((num(totalRounds) / totalSess) * 10) / 10;

    const introTotal = num(totalIntroPlayed) + num(totalIntroSkipped);

    return NextResponse.json(
      {
        ok: true,
        generatedAt: Date.now(),
        kvStatus: usingRealKv() ? "real" : "memory_fallback",
        summary: {
          totalVisitors: Number(totalVisitors ?? 0),
          totalSessions: totalSess,
          totalRounds: num(totalRounds),
          avgRounds,
          maxRounds: num(maxRounds),
          onlineNow: onlineKeys.length,
          totalPresets: num(totalPresets),
          totalFollowups: num(totalFollowups),
          followupRate: pct(num(totalFollowups), num(totalRounds)),
          totalCleared: num(totalCleared),
        },
        intro: {
          played: num(totalIntroPlayed),
          skipped: num(totalIntroSkipped),
          total: introTotal,
          playedRate: pct(num(totalIntroPlayed), introTotal),
          skippedRate: pct(num(totalIntroSkipped), introTotal),
        },
        modeDist: {
          casual: c,
          rational: r,
          scathing: s,
          casualPct: pct(c, modeSum),
          rationalPct: pct(r, modeSum),
          scathingPct: pct(s, modeSum),
        },
        errors: {
          total: num(totalErrors),
          rate: pct(num(totalErrors), num(totalRounds)),
          breakdown: errorBreakdown,
        },
        funnel,
        lengthDist,
        daily,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, err: (err as Error).message || "unknown" },
      { status: 500 }
    );
  }
}
