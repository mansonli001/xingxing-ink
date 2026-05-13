"use client";

import type * as React from "react";
import type { ModeId } from "./modeMeta";

/**
 * 三种人格剪影 —— v4 AI 生图 + SVG 混合
 * - 大剪影（右下角背景装饰）：三档各一张 AI 生图，模式切换时渐变过渡
 *   · casual   → 温柔咖啡姐
 *   · rational → 理性顾问御姐
 *   · scathing → 毒舌女王
 * - 小剪影（卡片右侧 MiniSilhouette）：保留 SVG（尺寸太小不适合 AI 图片）
 */

interface SilhouetteBackdropProps {
  mode: ModeId;
  hasMessages?: boolean;
  /** v0.4：是否正在播放 AI 语音；true 时当前活动人像呼吸脉动 */
  speaking?: boolean;
  /** v0.7.9.5.5.1：当前轮次（0=未开始，1+=已经开始对话）；用于按轮次渐进显形人像 */
  turnCount?: number;
}

const SILHOUETTE_SRC: Record<ModeId, string> = {
  casual: "/silhouettes/casual.png",
  rational: "/silhouettes/rational.png",
  scathing: "/silhouettes/scathing.png",
};

const MODES: ModeId[] = ["casual", "rational", "scathing"];

/**
 * v0.7.9.5.5.1 · 按轮次渐进显形
 *
 * 第 0 轮（未开始）→ opacity 0.16 / blur 8px（最模糊）
 * 第 1 轮          → opacity 0.22 / blur 7px
 * 第 2 轮          → opacity 0.28 / blur 6px
 * 第 3 轮          → opacity 0.34 / blur 5px
 * 第 4 轮          → opacity 0.40 / blur 4px
 * 第 5 轮          → opacity 0.46 / blur 3px
 * 第 6 轮          → opacity 0.52 / blur 2px
 * 第 7 轮          → opacity 0.55 / blur 1.5px
 * 第 8+ 轮         → opacity 0.58 / blur 1px（接近清晰，仍保留剪影感避免抢戏）
 *
 * 配合 1.5s ease 过渡让变化自然，不闪不跳。
 */
function calcSilhouetteOpacity(turn: number): number {
  const base = 0.16;
  const max = 0.58;
  const stepCount = 8;
  if (turn <= 0) return base;
  if (turn >= stepCount) return max;
  return base + ((max - base) / stepCount) * turn;
}

function calcSilhouetteBlur(turn: number): number {
  // 单位 px
  const base = 8;
  const min = 1;
  const stepCount = 8;
  if (turn <= 0) return base;
  if (turn >= stepCount) return min;
  return base - ((base - min) / stepCount) * turn;
}

export function SilhouetteBackdrop({
  mode,
  hasMessages = false,
  speaking = false,
  turnCount = 0,
}: SilhouetteBackdropProps) {
  const opacity = calcSilhouetteOpacity(turnCount);
  const blurPx = calcSilhouetteBlur(turnCount);
  return (
    <div
      className="silhouette-backdrop"
      data-has-messages={hasMessages ? "true" : "false"}
      data-speaking={speaking ? "true" : "false"}
      data-turn={turnCount}
      style={
        {
          // 自定义属性驱动 CSS 透明度和模糊度（CSS 端用 var() 引用）
          "--silhouette-opacity": opacity.toFixed(3),
          "--silhouette-blur": `${blurPx.toFixed(2)}px`,
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      {/* 三张图叠在一起，通过 opacity 切换，避免切换时闪白 */}
      {MODES.map((m) => (
        <img
          key={m}
          src={SILHOUETTE_SRC[m]}
          alt=""
          className="silhouette-img"
          data-active={m === mode ? "true" : "false"}
          data-speaking={m === mode && speaking ? "true" : "false"}
          loading={m === mode ? "eager" : "lazy"}
        />
      ))}
    </div>
  );
}

/* =========================================================
 * 迷你剪影（模式卡片右侧） —— AI 头像圆形版
 * 与大剪影保持人物一致，气质区分清晰
 * ========================================================= */

const AVATAR_SRC: Record<ModeId, string> = {
  casual: "/silhouettes/casual-avatar.png",
  rational: "/silhouettes/rational-avatar.png",
  scathing: "/silhouettes/scathing-avatar.png",
};

export function MiniSilhouette({
  mode,
  active,
}: {
  mode: ModeId;
  active?: boolean;
}) {
  return (
    <div
      className={[
        "mini-avatar",
        active ? "mini-avatar-active" : "mini-avatar-dim",
      ].join(" ")}
      aria-hidden="true"
    >
      <img src={AVATAR_SRC[mode]} alt="" loading="lazy" />
    </div>
  );
}
