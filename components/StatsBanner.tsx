"use client";

import { useEffect, useRef, useState } from "react";

/**
 * StatsBanner · 首屏运营数据条
 *
 * 设计原则（v0.7.9.2 上线，替换"LOADING IN PROGRESS"小字位）：
 *  1. 融入感优先 —— 玫瑰金/米色家族配色、衬线宋体、细字距，绝不引入新色彩
 *  2. 视觉分层    —— 两行文案：主数据行（大）+ 实时行（小·带呼吸点），不抢"醒醒"大字
 *  3. 动画克制    —— 首次进场 600ms fade，数字首次加载滚 1.1s 收尾；之后轮询刷新不滚动，只静默替换
 *  4. 冷启兜底    —— totalRounds < 30 时切换"刚开张"文案，小数字真实可信，不造假
 *  5. 数据失败    —— 永远不显示骨架屏，渲染为 null（上层什么都不会多出来）
 *  6. 隐私友好    —— 只读 /api/stats/summary，不传任何用户身份
 *  7. 可 hover    —— 右端一个极小的 ▾，hover 弹出三档分布 tooltip（移动端改为点击）
 *
 * 文案方案 A（用户已拍板）：
 *   大行：醒醒已陪 1,247 位朋友 · 捶过 8,653 轮
 *   小行：· 此刻还有 3 人正在被骂醒 ·
 *
 * 冷启文案（UV < 20 OR rounds < 30）：
 *   大行：醒醒刚开张几天 · 已陪 {N} 位朋友醒过来
 *   小行：· 此刻还有 {M} 人在桌上 ·
 */

type ModeDist = {
  casual: number;
  rational: number;
  scathing: number;
  casualPct: number;
  rationalPct: number;
  scathingPct: number;
};

type StatsSummary = {
  totalVisitors: number;
  totalRounds: number;
  onlineNow: number;
  maxRounds: number;
  modeDist: ModeDist;
  generatedAt: number;
};

// 60s 轮询一次（跟后端 cache-control 一致，避免空耗）
const POLL_INTERVAL_MS = 60_000;
// 冷启阈值：总轮数 < 30 用"刚开张"文案
const COLDSTART_ROUNDS = 30;

export function StatsBanner() {
  const [data, setData] = useState<StatsSummary | null>(null);
  const [failed, setFailed] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // ▾ 被点/hover 时，基于按钮视口位置定位 tooltip（fixed 定位挣脱 overflow 裁切）
  const computeTooltipPos = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setTooltipPos({
      top: rect.bottom + 10, // 按钮下方 10px
      left: rect.left + rect.width / 2, // 对齐按钮中点（tooltip 自己用 translateX(-50%)）
    });
  };

  const openTooltip = () => {
    computeTooltipPos();
    setShowTooltip(true);
  };
  const closeTooltip = () => setShowTooltip(false);

  // 轮询数据
  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    const fetchOnce = async () => {
      try {
        const res = await fetch("/api/stats/summary", {
          // 让浏览器配合 CDN 缓存
          cache: "default",
        });
        if (!res.ok) throw new Error("bad_status");
        const json = (await res.json()) as StatsSummary;
        if (cancelled) return;
        setData(json);
        setFailed(false);
        if (firstLoad) setFirstLoad(false);
      } catch {
        if (cancelled) return;
        setFailed(true);
        if (firstLoad) setFirstLoad(false);
      }
    };

    fetchOnce();
    timer = window.setInterval(fetchOnce, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (timer !== null) window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 点击外部关闭 tooltip（移动端友好）
  useEffect(() => {
    if (!showTooltip) return;
    const onClick = (e: MouseEvent) => {
      if (
        tooltipRef.current?.contains(e.target as Node) ||
        btnRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setShowTooltip(false);
    };
    // 窗口缩放/滚动时重新定位或关闭
    const onReposition = () => {
      if (btnRef.current) computeTooltipPos();
    };
    document.addEventListener("mousedown", onClick);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [showTooltip]);

  // 首次加载 & 加载失败 → 渲染 null（不让页面闪骨架）
  if (firstLoad) return null;
  if (failed || !data) return null;

  const { totalVisitors, totalRounds, onlineNow, modeDist } = data;
  const isColdStart = totalRounds < COLDSTART_ROUNDS;

  return (
    <div
      className="stats-banner relative flex flex-col items-center gap-1.5 mt-1 mb-6 select-none"
      aria-label="醒醒运营数据"
    >
      {/* 主数据行 */}
      <div className="stats-line-main">
        {isColdStart ? (
          <>
            醒醒刚开张几天 · 已陪{" "}
            <AnimatedNumber value={totalVisitors} firstLoad /> 位朋友醒过来
          </>
        ) : (
          <>
            醒醒已陪 <AnimatedNumber value={totalVisitors} firstLoad /> 位朋友 ·
            捶过 <AnimatedNumber value={totalRounds} firstLoad /> 轮
          </>
        )}
        {/* 三档分布悬浮按钮（极小 ▾） */}
        <button
          ref={btnRef}
          type="button"
          onMouseEnter={openTooltip}
          onMouseLeave={closeTooltip}
          onClick={() => (showTooltip ? closeTooltip() : openTooltip())}
          aria-label="查看三档人格分布"
          className="stats-dist-trigger"
        >
          ▾
        </button>

        {/* 悬浮 tooltip · 用 fixed 定位挣脱父容器 overflow 裁切 */}
        {showTooltip && tooltipPos && (
          <div
            ref={tooltipRef}
            className="stats-dist-tooltip"
            role="tooltip"
            aria-live="polite"
            style={{
              position: "fixed",
              top: `${tooltipPos.top}px`,
              left: `${tooltipPos.left}px`,
              transform: "translateX(-50%)",
              zIndex: 9999,
            }}
            onMouseEnter={openTooltip}
            onMouseLeave={closeTooltip}
          >
            <div className="tooltip-title">三档人格分布</div>
            <DistRow
              label="随便聊"
              pct={modeDist.casualPct}
              count={modeDist.casual}
              color="rose"
            />
            <DistRow
              label="讲道理"
              pct={modeDist.rationalPct}
              count={modeDist.rational}
              color="gold"
            />
            <DistRow
              label="扇巴掌"
              pct={modeDist.scathingPct}
              count={modeDist.scathing}
              color="red"
            />
          </div>
        )}
      </div>

      {/* 实时在线行（带呼吸点） */}
      {onlineNow > 0 && (
        <div className="stats-line-online">
          <span className="online-dot" aria-hidden />
          {isColdStart
            ? `此刻还有 ${onlineNow} 人在桌上`
            : `此刻还有 ${onlineNow} 人正在被骂醒`}
        </div>
      )}

      <style jsx>{`
        .stats-banner {
          /* 首次 600ms fade-in，跟 EmptyState 已有的 fade-in 节奏一致 */
          animation: stats-fade-in 600ms ease-out both;
          animation-delay: 150ms;
        }

        .stats-line-main {
          font-family: "Cormorant Garamond", "Noto Serif SC", "Songti SC", serif;
          font-style: italic;
          font-weight: 500;
          font-size: 13px;
          letter-spacing: 0.06em;
          line-height: 1.7;
          color: rgba(212, 175, 122, 0.88); /* 玫瑰金 88% */
          text-align: center;
          position: relative;
        }

        /* 数字用 Manrope，跟 logo 字号体系对齐，略亮一档突出 */
        .stats-line-main :global(.stats-number) {
          font-family: "Manrope", "Inter Tight", sans-serif;
          font-style: normal;
          font-weight: 700;
          font-size: 14px;
          letter-spacing: 0.01em;
          color: #f0e8e8; /* xx-text 米白，数字抢眼 */
          margin: 0 2px;
          text-shadow: 0 0 12px rgba(232, 180, 184, 0.14);
        }

        .stats-line-online {
          font-family: "Cormorant Garamond", "Noto Serif SC", serif;
          font-style: italic;
          font-weight: 500;
          font-size: 11.5px;
          letter-spacing: 0.08em;
          color: rgba(232, 180, 184, 0.55); /* 玫瑰粉 55% · 比主行更淡 */
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* 呼吸金点：告诉用户"这个数字是活的" */
        .online-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #d4af7a;
          box-shadow: 0 0 0 0 rgba(212, 175, 122, 0.6);
          animation: online-pulse 2.2s ease-in-out infinite;
          display: inline-block;
        }

        .stats-dist-trigger {
          display: inline-block;
          margin-left: 8px;
          font-size: 10px;
          line-height: 1;
          vertical-align: middle;
          color: rgba(212, 175, 122, 0.45);
          background: transparent;
          border: 0;
          padding: 2px 4px;
          cursor: pointer;
          transition: color 0.2s ease;
          font-style: normal;
        }
        .stats-dist-trigger:hover {
          color: #d4af7a;
        }

        .stats-dist-tooltip {
          /* position/top/left/transform/z-index 由 JSX 内联 style 设置（fixed 定位挣脱 overflow 裁切） */
          min-width: 220px;
          padding: 12px 14px 10px;
          background: rgba(31, 24, 40, 0.96);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(212, 175, 122, 0.28);
          border-radius: 10px;
          box-shadow:
            0 8px 28px -8px rgba(0, 0, 0, 0.55),
            0 0 0 1px rgba(232, 180, 184, 0.04) inset;
          animation: tooltip-fade 200ms ease-out both;
          font-style: normal;
          pointer-events: auto;
        }

        .stats-dist-tooltip :global(.tooltip-title) {
          font-family: "Cormorant Garamond", "Noto Serif SC", serif;
          font-style: italic;
          font-size: 11px;
          letter-spacing: 0.12em;
          color: rgba(232, 180, 184, 0.62);
          margin-bottom: 8px;
          text-align: center;
        }

        @keyframes stats-fade-in {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes online-pulse {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(212, 175, 122, 0.55);
            opacity: 0.9;
          }
          50% {
            box-shadow: 0 0 0 6px rgba(212, 175, 122, 0);
            opacity: 1;
          }
        }

        @keyframes tooltip-fade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        /* 减少动画偏好 */
        @media (prefers-reduced-motion: reduce) {
          .stats-banner {
            animation: none;
          }
          .online-dot {
            animation: none;
            box-shadow: 0 0 6px rgba(212, 175, 122, 0.45);
          }
        }

        /* 小屏：字号再收一档 */
        @media (max-width: 499px) {
          .stats-line-main {
            font-size: 12px;
            letter-spacing: 0.04em;
            padding: 0 12px;
          }
          .stats-line-main :global(.stats-number) {
            font-size: 13px;
          }
          .stats-line-online {
            font-size: 10.5px;
            letter-spacing: 0.06em;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// 数字滚动组件（仅首次加载做 1.1s 递增动画，后续轮询静默替换）
// ============================================================
function AnimatedNumber({
  value,
  firstLoad,
}: {
  value: number;
  firstLoad: boolean;
}) {
  const [display, setDisplay] = useState(firstLoad ? 0 : value);
  const prevValueRef = useRef(value);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    // 只在组件挂载后第一次"有 value"时做一次滚动
    if (hasAnimatedRef.current) {
      // 后续更新静默替换（避免用户盯着数字每分钟跳一次）
      setDisplay(value);
      prevValueRef.current = value;
      return;
    }

    hasAnimatedRef.current = true;
    const from = 0;
    const to = value;
    if (to <= 0) {
      setDisplay(0);
      return;
    }

    const duration = 1100;
    const start = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      const curr = Math.round(from + (to - from) * eased);
      setDisplay(curr);
      if (t < 1) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <span className="stats-number">{formatNumber(display)}</span>;
}

function formatNumber(n: number): string {
  if (n < 1000) return String(n);
  // 千分位分隔
  return n.toLocaleString("en-US");
}

// ============================================================
// Tooltip 分布行
// ============================================================
function DistRow({
  label,
  pct,
  count,
  color,
}: {
  label: string;
  pct: number;
  count: number;
  color: "rose" | "gold" | "red";
}) {
  const colorMap = {
    rose: "#e8b4b8",
    gold: "#d4af7a",
    red: "#c98a8e",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "3px 0",
        fontFamily: '"PingFang SC", "Noto Serif SC", sans-serif',
        fontSize: 12,
      }}
    >
      <span
        style={{
          color: colorMap[color],
          fontWeight: 500,
          width: 48,
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 4,
          background: "rgba(58, 46, 68, 0.6)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: colorMap[color],
            opacity: 0.85,
            transition: "width 400ms ease",
          }}
        />
      </div>
      <span
        style={{
          fontFamily: '"Manrope", sans-serif',
          color: "#f0e8e8",
          fontSize: 11,
          fontWeight: 600,
          width: 34,
          textAlign: "right",
          letterSpacing: "0.02em",
        }}
      >
        {pct}%
      </span>
      <span
        style={{
          fontFamily: '"Cormorant Garamond", serif',
          fontStyle: "italic",
          color: "rgba(232, 180, 184, 0.45)",
          fontSize: 10.5,
          width: 28,
          textAlign: "right",
        }}
      >
        {count}
      </span>
    </div>
  );
}
