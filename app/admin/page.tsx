"use client";

/**
 * /admin?key=XXX · 醒醒后台数据面板
 *
 * 你一个人看的私密页面，密码从 URL ?key= 传入
 *
 * 内容（越丰富越好 · v0.7.9.2 初版）：
 *   · 核心指标卡 × 6（UV / 开聊 / 总轮 / 平均轮 / 最长 / 当前在线）
 *   · 开场漏斗（播完 vs 跳过）
 *   · 三档人格分布（条形图）
 *   · 轮次漏斗（第 1/3/5/8/12/20 轮各有多少人到达）
 *   · 文本长度分布（xs/s/m/l/xl）
 *   · 错误分类（auth/rate_limit/network/5xx/too_long/unknown）
 *   · 每日日志（14 天）· 可切换 7/14/30/60 天
 *   · KV 连接状态指示
 *   · 时间戳 + 刷新按钮
 *
 * 所有配色走醒醒品牌色（暗夜玫瑰），不用标准 dashboard UI 库
 */

import { useCallback, useEffect, useMemo, useState } from "react";

type DailyLog = {
  date: string;
  visitors: number;
  sessions: number;
  rounds: number;
  avgRounds: number;
  errors: number;
  errorRate: number;
  followups: number;
  mode: {
    casual: number;
    rational: number;
    scathing: number;
  };
};

type AdminData = {
  ok: boolean;
  err?: string;
  generatedAt: number;
  kvStatus: "real" | "memory_fallback";
  summary: {
    totalVisitors: number;
    totalSessions: number;
    totalRounds: number;
    avgRounds: number;
    maxRounds: number;
    onlineNow: number;
    totalPresets: number;
    totalFollowups: number;
    followupRate: number;
    totalCleared: number;
  };
  intro: {
    played: number;
    skipped: number;
    total: number;
    playedRate: number;
    skippedRate: number;
  };
  modeDist: {
    casual: number;
    rational: number;
    scathing: number;
    casualPct: number;
    rationalPct: number;
    scathingPct: number;
  };
  errors: {
    total: number;
    rate: number;
    breakdown: { type: string; count: number }[];
  };
  funnel: { turn: number; reached: number; pct: number }[];
  lengthDist: { bucket: string; count: number; pct: number }[];
  daily: DailyLog[];
};

export default function AdminPage() {
  const [key, setKey] = useState<string>("");
  const [data, setData] = useState<AdminData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState<number>(14);

  // 从 URL 读 key
  useEffect(() => {
    const u = new URL(window.location.href);
    const k = u.searchParams.get("key") || "";
    setKey(k);
  }, []);

  const load = useCallback(async () => {
    if (!key) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/stats/admin?key=${encodeURIComponent(key)}&days=${days}`, {
        cache: "no-store",
      });
      if (res.status === 401) {
        setErr("密钥错误 · 检查 URL ?key= 参数");
        setData(null);
        return;
      }
      if (!res.ok) {
        setErr(`接口异常 · HTTP ${res.status}`);
        setData(null);
        return;
      }
      const json = (await res.json()) as AdminData;
      setData(json);
    } catch (e) {
      setErr((e as Error).message || "fetch failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [key, days]);

  useEffect(() => {
    if (key) load();
  }, [key, days, load]);

  if (!key) {
    return (
      <main className="min-h-[100dvh] bg-xx-bg text-xx-text p-8 flex items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="logo-serif text-3xl mb-4">醒醒 · 后台</h1>
          <p className="text-xx-text-dim mb-6">
            请在 URL 添加 <code className="px-2 py-0.5 bg-xx-bg-2 rounded">?key=XXX</code> 访问
          </p>
          <p className="text-xs text-xx-text-dim">
            密钥配置于 Vercel 环境变量 <code>ADMIN_KEY</code>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-xx-bg text-xx-text">
      {/* 顶栏 */}
      <header className="sticky top-0 z-10 px-6 py-4 border-b border-xx-border bg-xx-bg/95 backdrop-blur-md">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-baseline gap-4">
            <h1 className="logo-serif text-2xl">醒醒 · 后台</h1>
            <span className="text-[11px] tracking-[0.3em] font-display text-xx-text-dim">
              ADMIN DASHBOARD
            </span>
          </div>
          <div className="flex items-center gap-3">
            {data && (
              <span className="text-xs text-xx-text-dim">
                更新于 {formatTime(data.generatedAt)}
              </span>
            )}
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded border border-xx-border hover:border-xx-gold hover:text-xx-gold transition-colors disabled:opacity-50"
            >
              {loading ? "拉取中…" : "刷新"}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {err && (
          <div className="p-4 border border-xx-red/60 bg-xx-red-deep/30 rounded text-sm">
            {err}
          </div>
        )}

        {!data && !err && !loading && (
          <div className="text-center text-xx-text-dim py-20">暂无数据</div>
        )}

        {data && (
          <>
            {/* KV 状态 */}
            <div className="flex items-center gap-2 text-xs">
              <span
                className={[
                  "inline-block w-2 h-2 rounded-full",
                  data.kvStatus === "real" ? "bg-green-500" : "bg-yellow-500",
                ].join(" ")}
              />
              <span className="text-xx-text-dim">
                KV 状态：
                {data.kvStatus === "real"
                  ? "已连接 Vercel KV"
                  : "内存降级（本地开发 / KV 未配置）"}
              </span>
            </div>

            {/* 核心指标卡 × 6 */}
            <Section title="核心指标">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <MetricCard
                  label="累计 UV"
                  value={data.summary.totalVisitors}
                  sub="独立访客"
                />
                <MetricCard
                  label="累计开聊"
                  value={data.summary.totalSessions}
                  sub="session 数"
                />
                <MetricCard
                  label="总轮数"
                  value={data.summary.totalRounds}
                  sub="message_sent"
                  accent
                />
                <MetricCard
                  label="平均轮数"
                  value={data.summary.avgRounds}
                  sub="轮/session"
                  accent
                />
                <MetricCard
                  label="最长一次"
                  value={data.summary.maxRounds}
                  sub="轮"
                />
                <MetricCard
                  label="此刻在线"
                  value={data.summary.onlineNow}
                  sub="2min 活跃"
                  live
                />
              </div>
            </Section>

            {/* 二级指标 */}
            <Section title="二级指标">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricCard
                  label="追问点击"
                  value={data.summary.totalFollowups}
                  sub={`${data.summary.followupRate}% 轮触发`}
                />
                <MetricCard
                  label="预制命中"
                  value={data.summary.totalPresets}
                  sub="tip 点击"
                />
                <MetricCard
                  label="清空重开"
                  value={data.summary.totalCleared}
                  sub="session 重置"
                />
                <MetricCard
                  label="错误总数"
                  value={data.errors.total}
                  sub={`${data.errors.rate}% 错误率`}
                  warn={data.errors.rate > 5}
                />
              </div>
            </Section>

            {/* 开场漏斗 */}
            <Section title="开场动画漏斗">
              <div className="grid grid-cols-2 gap-3">
                <FunnelBar
                  label="看完"
                  count={data.intro.played}
                  pct={data.intro.playedRate}
                  color="gold"
                />
                <FunnelBar
                  label="跳过"
                  count={data.intro.skipped}
                  pct={data.intro.skippedRate}
                  color="rose"
                />
              </div>
              <p className="text-xs text-xx-text-dim mt-2">
                看完比例越高说明开场动画越被接受；跳过&gt;70% 说明太冗长。
              </p>
            </Section>

            {/* 三档人格 */}
            <Section title="三档人格分布">
              <div className="space-y-2">
                <FunnelBar
                  label="随便聊"
                  count={data.modeDist.casual}
                  pct={data.modeDist.casualPct}
                  color="rose"
                />
                <FunnelBar
                  label="讲道理"
                  count={data.modeDist.rational}
                  pct={data.modeDist.rationalPct}
                  color="gold"
                />
                <FunnelBar
                  label="扇巴掌"
                  count={data.modeDist.scathing}
                  pct={data.modeDist.scathingPct}
                  color="red"
                />
              </div>
            </Section>

            {/* 轮次漏斗 */}
            <Section title="轮次漏斗">
              <div className="space-y-2">
                {data.funnel.map((f) => (
                  <FunnelBar
                    key={f.turn}
                    label={`第 ${f.turn} 轮`}
                    count={f.reached}
                    pct={f.pct}
                    color={f.turn >= 8 ? "gold" : "rose"}
                  />
                ))}
              </div>
              <p className="text-xs text-xx-text-dim mt-2">
                到达 N 轮的 session 数。第 1 轮 = 100%；第 3 轮&gt;40% 健康；第 8 轮&gt;10%
                说明内容够深；第 12 轮&gt;5% 是粘性用户。
              </p>
            </Section>

            {/* 文本长度分布 */}
            <Section title="用户输入长度分布">
              <div className="space-y-2">
                {data.lengthDist.map((d) => (
                  <FunnelBar
                    key={d.bucket}
                    label={lengthLabel(d.bucket)}
                    count={d.count}
                    pct={d.pct}
                    color="gold"
                  />
                ))}
              </div>
              <p className="text-xs text-xx-text-dim mt-2">
                xs(0-20字) · s(21-80) · m(81-200) · l(201-500) · xl(500+)
              </p>
            </Section>

            {/* 错误分类 */}
            <Section title="错误分类">
              <div className="space-y-2">
                {data.errors.breakdown
                  .filter((e) => e.count > 0)
                  .sort((a, b) => b.count - a.count)
                  .map((e) => (
                    <div
                      key={e.type}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span className="w-24 text-xx-text-dim">{e.type}</span>
                      <span className="text-xx-rose font-mono">{e.count}</span>
                    </div>
                  ))}
                {data.errors.breakdown.every((e) => e.count === 0) && (
                  <p className="text-sm text-xx-text-dim">暂无错误记录</p>
                )}
              </div>
            </Section>

            {/* 每日日志 */}
            <Section
              title={`每日日志 · 最近 ${days} 天`}
              extra={
                <div className="flex items-center gap-2 text-xs">
                  {[7, 14, 30, 60].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDays(d)}
                      className={[
                        "px-2 py-1 rounded border",
                        days === d
                          ? "border-xx-gold text-xx-gold"
                          : "border-xx-border text-xx-text-dim hover:border-xx-gold/50",
                      ].join(" ")}
                    >
                      {d}天
                    </button>
                  ))}
                </div>
              }
            >
              <DailyTable rows={data.daily} />
            </Section>

            <footer className="text-center text-xs text-xx-text-dim py-8 border-t border-xx-border">
              v0.7.9.2 · 自建 KV 数据后台 · Loading in Progress
            </footer>
          </>
        )}
      </div>
    </main>
  );
}

// ============================================================
// 子组件
// ============================================================
function Section({
  title,
  children,
  extra,
}: {
  title: string;
  children: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg text-xx-rose tracking-wide">{title}</h2>
        {extra}
      </div>
      <div>{children}</div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  sub,
  accent,
  warn,
  live,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent?: boolean;
  warn?: boolean;
  live?: boolean;
}) {
  return (
    <div
      className={[
        "p-4 rounded-lg border bg-xx-bg-2/70 relative overflow-hidden",
        accent
          ? "border-xx-gold/50"
          : warn
          ? "border-xx-red/50"
          : "border-xx-border",
      ].join(" ")}
    >
      {live && (
        <span className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
      )}
      <div className="text-[11px] tracking-[0.15em] text-xx-text-dim uppercase font-display">
        {label}
      </div>
      <div
        className={[
          "mt-1.5 font-display font-bold text-2xl",
          accent ? "text-xx-gold" : warn ? "text-xx-rose" : "text-xx-text",
        ].join(" ")}
      >
        {typeof value === "number" ? value.toLocaleString("en-US") : value}
      </div>
      {sub && (
        <div className="text-[10px] text-xx-text-dim mt-0.5 font-serif italic">
          {sub}
        </div>
      )}
    </div>
  );
}

function FunnelBar({
  label,
  count,
  pct,
  color,
}: {
  label: string;
  count: number;
  pct: number;
  color: "rose" | "gold" | "red";
}) {
  const colorMap = {
    rose: "#e8b4b8",
    gold: "#d4af7a",
    red: "#c98a8e",
  };
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-20 text-xx-text-dim shrink-0 text-[13px]">
        {label}
      </span>
      <div className="flex-1 h-5 bg-xx-bg-2 rounded overflow-hidden relative">
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${Math.max(pct, 2)}%`,
            background: colorMap[color],
            opacity: 0.75,
          }}
        />
        <span className="absolute inset-0 flex items-center px-2 text-[11px] font-mono text-white/90">
          {count.toLocaleString("en-US")}
        </span>
      </div>
      <span
        className="w-12 text-right font-mono text-[12px]"
        style={{ color: colorMap[color] }}
      >
        {pct}%
      </span>
    </div>
  );
}

function DailyTable({ rows }: { rows: DailyLog[] }) {
  // 倒序显示（今天在最上面）
  const reversed = useMemo(() => [...rows].reverse(), [rows]);

  return (
    <div className="overflow-x-auto rounded-lg border border-xx-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-xx-bg-2 text-[11px] tracking-[0.1em] text-xx-text-dim uppercase font-display">
            <th className="px-3 py-2 text-left">日期</th>
            <th className="px-3 py-2 text-right">UV</th>
            <th className="px-3 py-2 text-right">开聊</th>
            <th className="px-3 py-2 text-right">轮数</th>
            <th className="px-3 py-2 text-right">均轮</th>
            <th className="px-3 py-2 text-right">追问</th>
            <th className="px-3 py-2 text-right">错误</th>
            <th className="px-3 py-2 text-right">错误率</th>
            <th className="px-3 py-2 text-right">闲</th>
            <th className="px-3 py-2 text-right">理</th>
            <th className="px-3 py-2 text-right">扇</th>
          </tr>
        </thead>
        <tbody className="font-mono text-[12.5px]">
          {reversed.map((r, i) => {
            const isEmpty = r.sessions === 0 && r.rounds === 0;
            return (
              <tr
                key={r.date}
                className={[
                  "border-t border-xx-border",
                  i === 0 ? "bg-xx-gold/5" : "",
                  isEmpty ? "opacity-40" : "",
                ].join(" ")}
              >
                <td className="px-3 py-2 text-xx-rose">{r.date}</td>
                <td className="px-3 py-2 text-right">{r.visitors}</td>
                <td className="px-3 py-2 text-right">{r.sessions}</td>
                <td className="px-3 py-2 text-right text-xx-gold">
                  {r.rounds}
                </td>
                <td className="px-3 py-2 text-right text-xx-gold">
                  {r.avgRounds}
                </td>
                <td className="px-3 py-2 text-right">{r.followups}</td>
                <td
                  className={[
                    "px-3 py-2 text-right",
                    r.errors > 0 ? "text-xx-rose" : "",
                  ].join(" ")}
                >
                  {r.errors}
                </td>
                <td
                  className={[
                    "px-3 py-2 text-right",
                    r.errorRate > 5 ? "text-xx-red" : "text-xx-text-dim",
                  ].join(" ")}
                >
                  {r.errorRate}%
                </td>
                <td className="px-3 py-2 text-right text-xx-rose/80">
                  {r.mode.casual}
                </td>
                <td className="px-3 py-2 text-right text-xx-gold/80">
                  {r.mode.rational}
                </td>
                <td className="px-3 py-2 text-right text-xx-red/80">
                  {r.mode.scathing}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// 工具
// ============================================================
function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function lengthLabel(bucket: string): string {
  switch (bucket) {
    case "xs":
      return "xs (0-20字)";
    case "s":
      return "s (21-80)";
    case "m":
      return "m (81-200)";
    case "l":
      return "l (201-500)";
    case "xl":
      return "xl (500+)";
    default:
      return bucket;
  }
}
