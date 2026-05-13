/**
 * v0.7.9.7.1 · 动态 OG 图生成路由（next/og）
 *
 * URL：
 *   - /og              → 默认综合版（三档全亮 + 默认引文）
 *   - /og?mode=casual  → 粉紫调 + casual 金句 + ❍ 高亮
 *   - /og?mode=rational → 玫瑰金调 + rational 金句 + ⌖ 高亮
 *   - /og?mode=scathing → 暗血红调 + scathing 金句 + ✕ 高亮
 *
 * 排版（选项 3 三段递进）：
 *   1. 主标题「醒醒」（金色 240px）
 *   2. 钩子句「不哄人，只怼人」（玫瑰金 64px）
 *   3. 引文块（暗血红描边 + 白色金句 56px + 主题色 outer glow）
 *   4. 三档抽象符号（❍ 随便聊 / ⌖ 讲道理 / ✕ 扇巴掌）
 *   5. 角落签名（Loading in Progress / xingxing.starfluxes.com）
 *
 * 三档金句（用户拍板 2026-05-13）：
 *   - casual：姐不陪你做梦，但陪你说人话
 *   - rational：姐不评价你的感受，只看你的逻辑
 *   - scathing：别哭，姐还没开始扇
 *
 * 输出：1200×630 PNG，Edge Runtime 实时生成（首次 ~300ms，CDN 缓存后即时）
 */

import { ImageResponse } from "next/og";

export const runtime = "edge";

// 三档元数据（颜色 + 金句 + 符号 + 标签）
type ModeId = "casual" | "rational" | "scathing";

const MODE_META: Record<
  ModeId,
  {
    color: string;
    glowRGB: string;
    quote: string;
    symbol: string;
    label: string;
  }
> = {
  casual: {
    color: "#D170E8",
    glowRGB: "209, 112, 232",
    quote: "姐不陪你做梦，但陪你说人话",
    symbol: "❍",
    label: "随便聊",
  },
  rational: {
    color: "#E8B4B8", // 玫瑰金（plan 里 #64748B 是冷蓝，但用户视觉风格库里玫瑰金更贴合「讲道理」的克制感，按 v0.7.9.5.5.1 实际生效色）
    glowRGB: "232, 180, 184",
    quote: "姐不评价你的感受，只看你的逻辑",
    symbol: "⌖",
    label: "讲道理",
  },
  scathing: {
    color: "#991B1B",
    glowRGB: "153, 27, 27",
    quote: "别哭，姐还没开始扇",
    symbol: "✕",
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

  // 当前活动档（用于背景色调 + 引文 + 高亮）
  const activeMode = validMode;
  const activeMeta = activeMode ? MODE_META[activeMode] : null;
  const quote = activeMeta?.quote || DEFAULT_QUOTE;

  // 背景径向光晕主色：有 mode 用对应档色，无 mode 用三色叠加
  const bgGradient = activeMeta
    ? `radial-gradient(ellipse at 30% 20%, rgba(${activeMeta.glowRGB}, 0.18) 0%, transparent 55%), radial-gradient(ellipse at 70% 80%, rgba(${activeMeta.glowRGB}, 0.12) 0%, transparent 50%), linear-gradient(180deg, #14101a 0%, #1f1929 100%)`
    : `radial-gradient(ellipse at 20% 30%, rgba(209, 112, 232, 0.12) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(232, 180, 184, 0.10) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(153, 27, 27, 0.14) 0%, transparent 50%), linear-gradient(180deg, #14101a 0%, #1f1929 100%)`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "60px 80px",
          background: bgGradient,
          fontFamily: '"Noto Serif SC", "PingFang SC", serif',
          position: "relative",
        }}
      >
        {/* 顶部留空（让主标更聚焦） */}
        <div style={{ display: "flex", height: 20 }} />

        {/* 主标题：醒醒（巨字金色） */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              fontSize: 220,
              fontWeight: 700,
              color: "#d4af7a",
              letterSpacing: "0.18em",
              lineHeight: 1,
              textShadow:
                "0 4px 16px rgba(153, 27, 27, 0.5), 0 0 32px rgba(212, 175, 122, 0.3)",
              display: "flex",
            }}
          >
            醒醒
          </div>

          {/* 钩子句：不哄人，只怼人 */}
          <div
            style={{
              fontSize: 56,
              fontWeight: 500,
              color: "#e8b4b8",
              letterSpacing: "0.16em",
              marginTop: 4,
              display: "flex",
            }}
          >
            不哄人，只怼人
          </div>
        </div>

        {/* 引文块：金句 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "22px 48px",
            border: `2px solid rgba(${
              activeMeta?.glowRGB || "153, 27, 27"
            }, 0.55)`,
            borderRadius: 14,
            background: `rgba(${activeMeta?.glowRGB || "153, 27, 27"}, 0.08)`,
            boxShadow: `0 0 40px -8px rgba(${
              activeMeta?.glowRGB || "153, 27, 27"
            }, 0.4), inset 0 0 20px -4px rgba(${
              activeMeta?.glowRGB || "153, 27, 27"
            }, 0.15)`,
            maxWidth: 900,
          }}
        >
          <div
            style={{
              fontSize: 52,
              fontWeight: 600,
              color: "#fff5f0",
              letterSpacing: "0.06em",
              lineHeight: 1.4,
              textAlign: "center",
              display: "flex",
            }}
          >
            {quote}
          </div>
        </div>

        {/* 三档抽象符号 + 标签 */}
        <div
          style={{
            display: "flex",
            gap: 56,
            alignItems: "center",
          }}
        >
          {(["casual", "rational", "scathing"] as ModeId[]).map((m) => {
            const meta = MODE_META[m];
            const isActive = activeMode === null || activeMode === m;
            return (
              <div
                key={m}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  opacity: isActive ? 1 : 0.3,
                }}
              >
                <div
                  style={{
                    fontSize: 56,
                    color: meta.color,
                    fontWeight: 400,
                    lineHeight: 1,
                    textShadow: isActive
                      ? `0 0 20px rgba(${meta.glowRGB}, 0.6), 0 0 8px rgba(${meta.glowRGB}, 0.4)`
                      : "none",
                    display: "flex",
                  }}
                >
                  {meta.symbol}
                </div>
                <div
                  style={{
                    fontSize: 22,
                    color: meta.color,
                    fontWeight: 500,
                    letterSpacing: "0.12em",
                    display: "flex",
                  }}
                >
                  {meta.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* 底部签名（左：Loading in Progress · 右：域名） */}
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
              fontSize: 20,
              fontStyle: "italic",
              color: "rgba(232, 180, 184, 0.7)",
              letterSpacing: "0.18em",
              fontFamily: "'Cormorant Garamond', serif",
              display: "flex",
            }}
          >
            ◎ Loading in Progress
          </div>
          <div
            style={{
              fontSize: 18,
              color: "rgba(169, 168, 192, 0.6)",
              letterSpacing: "0.12em",
              fontFamily: "'Cormorant Garamond', serif",
              display: "flex",
            }}
          >
            xingxing.starfluxes.com
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      // CDN 缓存 1 小时（社交平台抓取时即时，但浏览器/CDN 减少 Edge 调用）
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    }
  );
}
