/**
 * v0.7.9.7.3 · 动态 OG 图 v3（next/og）
 *
 * v2 → v3 修复：
 *   1. 中文字符 tofu ☒ → 显式加载 Noto Sans SC 字体（jsdelivr CDN · weight 400/700）
 *   2. 整体太挤 → 主标 180→160 / 底部留空 +18 / padding 优化
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
 *
 * 字体加载策略：
 *   - 用 jsdelivr 镜像的 fontsource（Noto Sans SC v36 · subset cjk-sc · weight 400/700）
 *   - 在 ImageResponse 里通过 fonts 数组传入
 *   - 字体文件 fetch 后 Edge runtime 缓存（首次 ~500ms，后续即时）
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

/**
 * 加载 Noto Sans SC 中文字体（cjk-sc subset）
 *
 * 用 jsdelivr 镜像 fontsource —— 经测试在 Vercel Edge 上稳定可用。
 * weight 400 用于胶囊小字 / weight 700 用于主标和钩子。
 */
async function loadFonts(): Promise<
  Array<{
    name: string;
    data: ArrayBuffer;
    weight: 400 | 700;
    style: "normal";
  }>
> {
  // fontsource 提供 Noto Sans SC 简体中文子集 woff/woff2/ttf
  // 这里用 ttf（satori 必须 ttf 或 otf，不支持 woff2）
  const FONT_REGULAR =
    "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-sc@5.0.5/files/noto-sans-sc-chinese-simplified-400-normal.woff";
  const FONT_BOLD =
    "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-sc@5.0.5/files/noto-sans-sc-chinese-simplified-700-normal.woff";

  const [reg, bold] = await Promise.all([
    fetch(FONT_REGULAR).then((res) => res.arrayBuffer()),
    fetch(FONT_BOLD).then((res) => res.arrayBuffer()),
  ]);

  return [
    {
      name: "Noto Sans SC",
      data: reg,
      weight: 400,
      style: "normal",
    },
    {
      name: "Noto Sans SC",
      data: bold,
      weight: 700,
      style: "normal",
    },
  ];
}

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

  // 背景径向光晕（紧凑紫黑底 + 主题色光晕 · satori 兼容写法）
  const bgGradient = activeMeta
    ? `radial-gradient(circle at 50% 50%, rgba(${activeMeta.glowRGB}, 0.22) 0%, transparent 60%), radial-gradient(circle at 20% 80%, rgba(${activeMeta.glowRGB}, 0.15) 0%, transparent 55%), linear-gradient(180deg, #14101a 0%, #1f1929 100%)`
    : `radial-gradient(circle at 25% 30%, rgba(209, 112, 232, 0.15) 0%, transparent 50%), radial-gradient(circle at 75% 60%, rgba(204, 51, 68, 0.18) 0%, transparent 50%), linear-gradient(180deg, #14101a 0%, #1f1929 100%)`;

  const quoteColor = activeMeta?.glowRGB || "204, 51, 68";

  // 加载中文字体（如果失败则降级使用默认 Inter，至少英文部分能渲染）
  const fonts = await loadFonts().catch((err) => {
    console.error("[OG] font load failed:", err);
    return undefined;
  });

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
          fontFamily: '"Noto Sans SC", sans-serif',
          position: "relative",
          padding: "60px 100px 80px 100px",
        }}
      >
        {/* 主体内容居中堆叠 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
          }}
        >
          {/* 主标题：醒醒（v3：180→160 紧凑） */}
          <div
            style={{
              fontSize: 160,
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
              fontSize: 48,
              fontWeight: 500,
              color: "#e8b4b8",
              letterSpacing: "0.22em",
              display: "flex",
            }}
          >
            不哄人，只怼人
          </div>

          {/* 引文块（实底盖章） */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "22px 48px",
              border: `2px solid rgba(${quoteColor}, 0.65)`,
              borderRadius: 12,
              background: `linear-gradient(135deg, rgba(${quoteColor}, 0.22) 0%, rgba(${quoteColor}, 0.08) 100%)`,
              boxShadow: `0 0 50px -8px rgba(${quoteColor}, 0.5), inset 0 0 30px -8px rgba(${quoteColor}, 0.3)`,
              maxWidth: 980,
              marginTop: 8,
            }}
          >
            <div
              style={{
                fontSize: 44,
                fontWeight: 700,
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

          {/* 三档中文胶囊（v3：字体已加载，不再 tofu） */}
          <div
            style={{
              display: "flex",
              gap: 18,
              alignItems: "center",
              marginTop: 6,
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
                    padding: "10px 24px",
                    borderRadius: 26,
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
                      fontSize: 26,
                      fontWeight: isCurrentMode ? 700 : 400,
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

        {/* 底部签名（v0.7.9.7.7：删除分隔横线，留品牌签名 + 域名两侧对齐） */}
        <div
          style={{
            position: "absolute",
            bottom: 50,
            left: 100,
            right: 100,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
            <div
              style={{
                fontSize: 17,
                color: "rgba(232, 180, 184, 0.65)",
                letterSpacing: "0.2em",
                display: "flex",
                fontWeight: 400,
              }}
            >
              Loading in Progress
            </div>
            <div
              style={{
                fontSize: 15,
                color: "rgba(169, 168, 192, 0.55)",
                letterSpacing: "0.14em",
                display: "flex",
                fontWeight: 400,
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
      fonts,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    }
  );
}
