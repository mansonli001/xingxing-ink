/**
 * v0.7.9.7.2 · 动态 OG 图 v2（next/og）
 *
 * v1 → v2 修复（用户截图反馈）：
 *   1. tofu 方块 ❍/⌖/✕ → 改用中文胶囊「随便聊/讲道理/扇巴掌」（next/og 默认字体不支持 Unicode 抽象符号）
 *   2. 整体太空 → 元素紧凑垂直堆叠，去除 space-between 撑开
 *   3. 引文块孤立 → 改为暗血红半透明实底盖章（不仅是边框）
 *   4. 加底部签名横线收尾 → 给画面底盘
 *
 * URL：
 *   - /og              → 默认综合版（三档全亮 + 默认引文）
 *   - /og?mode=casual  → 粉紫调 + casual 金句 + 「随便聊」高亮
 *   - /og?mode=rational → 玫瑰金调 + rational 金句 + 「讲道理」高亮
 *   - /og?mode=scathing → 暗血红调 + scathing 金句 + 「扇巴掌」高亮
 *
 * 三档金句（用户拍板 A1/B2/C3）：
 *   - casual：姐不陪你做梦，但陪你说人话
 *   - rational：姐不评价你的感受，只看你的逻辑
 *   - scathing：别哭，姐还没开始扇
 */

import { ImageResponse } from "next/og";

export const runtime = "edge";

type ModeId = "casual" | "rational" | "scathing";

const MODE_META: Record<
  ModeId,
  {
    color: string;
    glowRGB: string;
    quote: string;
    label: string;
  }
> = {
  casual: {
    color: "#D170E8",
    glowRGB: "209, 112, 232",
    quote: "姐不陪你做梦，但陪你说人话",
    label: "随便聊",
  },
  rational: {
    color: "#E8B4B8",
    glowRGB: "232, 180, 184",
    quote: "姐不评价你的感受，只看你的逻辑",
    label: "讲道理",
  },
  scathing: {
    color: "#CC3344",
    glowRGB: "204, 51, 68",
    quote: "别哭，姐还没开始扇",
    label: "扇巴掌",
  },
};

const DEFAULT_QUOTE = "你的想法，敢给姐看吗？";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const modeParam = searchParams.get("mode");
  const validMode: ModeId | null =
    modeParam === "casual" ||
    modeParam === "rational" ||
    modeParam === "scathing"
      ? modeParam
      : null;

  const activeMode = validMode;
  const activeMeta = activeMode ? MODE_META[activeMode] : null;
  const quote = activeMeta?.quote || DEFAULT_QUOTE;

  // 背景径向光晕（紧凑紫黑底 + 主题色光晕 · satori 兼容写法：不带尺寸）
  const bgGradient = activeMeta
    ? `radial-gradient(circle at 50% 50%, rgba(${activeMeta.glowRGB}, 0.22) 0%, transparent 60%), radial-gradient(circle at 20% 80%, rgba(${activeMeta.glowRGB}, 0.15) 0%, transparent 55%), linear-gradient(180deg, #14101a 0%, #1f1929 100%)`
    : `radial-gradient(circle at 25% 30%, rgba(209, 112, 232, 0.15) 0%, transparent 50%), radial-gradient(circle at 75% 60%, rgba(204, 51, 68, 0.18) 0%, transparent 50%), linear-gradient(180deg, #14101a 0%, #1f1929 100%)`;

  // 引文块的颜色（无 mode 时用暗血红）
  const quoteColor = activeMeta?.glowRGB || "204, 51, 68";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: bgGradient,
          fontFamily: '"Noto Serif SC", "PingFang SC", serif',
          position: "relative",
          padding: "50px 80px 30px 80px",
        }}
      >
        {/* 主体内容居中堆叠（去掉 space-between 撑开） */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 28,
          }}
        >
          {/* 主标题：醒醒 */}
          <div
            style={{
              fontSize: 180,
              fontWeight: 700,
              color: "#d4af7a",
              letterSpacing: "0.16em",
              lineHeight: 1,
              textShadow:
                "0 4px 24px rgba(204, 51, 68, 0.55), 0 0 48px rgba(212, 175, 122, 0.35)",
              display: "flex",
            }}
          >
            醒醒
          </div>

          {/* 钩子句 */}
          <div
            style={{
              fontSize: 50,
              fontWeight: 500,
              color: "#e8b4b8",
              letterSpacing: "0.22em",
              display: "flex",
            }}
          >
            不哄人，只怼人
          </div>

          {/* 引文块（实底盖章 · 不只是边框） */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "26px 56px",
              border: `2px solid rgba(${quoteColor}, 0.65)`,
              borderRadius: 12,
              background: `linear-gradient(135deg, rgba(${quoteColor}, 0.22) 0%, rgba(${quoteColor}, 0.08) 100%)`,
              boxShadow: `0 0 50px -8px rgba(${quoteColor}, 0.5), inset 0 0 30px -8px rgba(${quoteColor}, 0.3)`,
              maxWidth: 980,
              marginTop: 12,
            }}
          >
            <div
              style={{
                fontSize: 48,
                fontWeight: 600,
                color: "#fff5f0",
                letterSpacing: "0.08em",
                lineHeight: 1.3,
                textAlign: "center",
                display: "flex",
                textShadow: `0 2px 12px rgba(${quoteColor}, 0.5)`,
              }}
            >
              {quote}
            </div>
          </div>

          {/* 三档中文胶囊（替代 v1 的 tofu 符号） */}
          <div
            style={{
              display: "flex",
              gap: 20,
              alignItems: "center",
              marginTop: 8,
            }}
          >
            {(["casual", "rational", "scathing"] as ModeId[]).map((m) => {
              const meta = MODE_META[m];
              const isActive = activeMode === null || activeMode === m;
              const isCurrentMode = activeMode === m;
              return (
                <div
                  key={m}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "12px 28px",
                    borderRadius: 28,
                    border: `${isCurrentMode ? 2 : 1.5}px solid rgba(${
                      meta.glowRGB
                    }, ${isActive ? 0.7 : 0.25})`,
                    background: isCurrentMode
                      ? `linear-gradient(135deg, rgba(${meta.glowRGB}, 0.3) 0%, rgba(${meta.glowRGB}, 0.12) 100%)`
                      : isActive
                      ? `rgba(${meta.glowRGB}, 0.08)`
                      : `rgba(${meta.glowRGB}, 0.03)`,
                    boxShadow: isActive
                      ? `0 0 24px -4px rgba(${meta.glowRGB}, 0.5)`
                      : "none",
                    opacity: isActive ? 1 : 0.4,
                  }}
                >
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: isCurrentMode ? 700 : 500,
                      color: meta.color,
                      letterSpacing: "0.16em",
                      display: "flex",
                    }}
                  >
                    {meta.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 底部签名横线（绝对定位贴底） */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: 80,
            right: 80,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          {/* 横线分隔 */}
          <div
            style={{
              width: "100%",
              height: 1,
              background: `linear-gradient(90deg, transparent 0%, rgba(232, 180, 184, 0.3) 50%, transparent 100%)`,
              display: "flex",
            }}
          />
          {/* 一行签名 */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontStyle: "italic",
                color: "rgba(232, 180, 184, 0.65)",
                letterSpacing: "0.2em",
                fontFamily: "'Cormorant Garamond', serif",
                display: "flex",
              }}
            >
              Loading in Progress
            </div>
            <div
              style={{
                fontSize: 16,
                color: "rgba(169, 168, 192, 0.55)",
                letterSpacing: "0.14em",
                fontFamily: "'Cormorant Garamond', serif",
                display: "flex",
              }}
            >
              xingxing.starfluxes.com
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    }
  );
}
