"use client";

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
}

const SILHOUETTE_SRC: Record<ModeId, string> = {
  casual: "/silhouettes/casual.png",
  rational: "/silhouettes/rational.png",
  scathing: "/silhouettes/scathing.png",
};

const MODES: ModeId[] = ["casual", "rational", "scathing"];

export function SilhouetteBackdrop({
  mode,
  hasMessages = false,
}: SilhouetteBackdropProps) {
  return (
    <div
      className="silhouette-backdrop"
      data-has-messages={hasMessages ? "true" : "false"}
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
