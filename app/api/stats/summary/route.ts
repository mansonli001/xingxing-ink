/**
 * GET /api/stats/summary
 *
 * 主页 StatsBanner 轮询端点（60s 缓存）
 * 返回 3 个核心指标 + 三档分布（hover 用）
 *
 * 对外公开 · 无鉴权 · 任何人都能看
 */
import { NextResponse } from "next/server";
import { getClient } from "@/lib/stats/kv";
import {
  K_VISITORS_SET,
  K_TOTAL_ROUNDS,
  K_MODE_CASUAL,
  K_MODE_RATIONAL,
  K_MODE_SCATHING,
  K_ONLINE_PATTERN,
  K_MAX_ROUNDS,
} from "@/lib/stats/keys";

export const runtime = "edge";
// Vercel Edge 缓存 60s（CDN + 浏览器）
export const revalidate = 60;

export type StatsSummary = {
  totalVisitors: number;
  totalRounds: number;
  onlineNow: number;
  maxRounds: number;
  modeDist: {
    casual: number;
    rational: number;
    scathing: number;
    casualPct: number;
    rationalPct: number;
    scathingPct: number;
  };
  generatedAt: number;
};

export async function GET() {
  try {
    const kv = await getClient();

    // 并行拉取所有数据
    const [
      totalVisitors,
      totalRounds,
      onlineKeys,
      maxRoundsRaw,
      casual,
      rational,
      scathing,
    ] = await Promise.all([
      kv.scard(K_VISITORS_SET).catch(() => 0),
      kv.get<string | number>(K_TOTAL_ROUNDS).catch(() => 0),
      kv.keys(K_ONLINE_PATTERN).catch(() => [] as string[]),
      kv.get<string | number>(K_MAX_ROUNDS).catch(() => 0),
      kv.get<string | number>(K_MODE_CASUAL).catch(() => 0),
      kv.get<string | number>(K_MODE_RATIONAL).catch(() => 0),
      kv.get<string | number>(K_MODE_SCATHING).catch(() => 0),
    ]);

    const c = Number(casual ?? 0);
    const r = Number(rational ?? 0);
    const s = Number(scathing ?? 0);
    const modeSum = c + r + s;

    const summary: StatsSummary = {
      totalVisitors: Number(totalVisitors ?? 0),
      totalRounds: Number(totalRounds ?? 0),
      onlineNow: onlineKeys.length,
      maxRounds: Number(maxRoundsRaw ?? 0),
      modeDist: {
        casual: c,
        rational: r,
        scathing: s,
        casualPct: modeSum === 0 ? 0 : Math.round((c / modeSum) * 100),
        rationalPct: modeSum === 0 ? 0 : Math.round((r / modeSum) * 100),
        scathingPct: modeSum === 0 ? 0 : Math.round((s / modeSum) * 100),
      },
      generatedAt: Date.now(),
    };

    return NextResponse.json(summary, {
      status: 200,
      headers: {
        // CDN 缓存 60s，浏览器缓存 20s，stale-while-revalidate 30s
        "Cache-Control":
          "public, s-maxage=60, max-age=20, stale-while-revalidate=30",
      },
    });
  } catch {
    // 任何异常都返回"零"值，前端会走冷启文案
    return NextResponse.json(
      {
        totalVisitors: 0,
        totalRounds: 0,
        onlineNow: 0,
        maxRounds: 0,
        modeDist: {
          casual: 0,
          rational: 0,
          scathing: 0,
          casualPct: 0,
          rationalPct: 0,
          scathingPct: 0,
        },
        generatedAt: Date.now(),
      } satisfies StatsSummary,
      { status: 200 }
    );
  }
}
