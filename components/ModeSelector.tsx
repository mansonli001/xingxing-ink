"use client";

import { type ModeId } from "./modeMeta";
import { MODE_META } from "./modeMeta";
import { MiniSilhouette } from "./SilhouetteBackdrop";

interface ModeSelectorProps {
  current: ModeId;
  onChange: (mode: ModeId) => void;
  disabled?: boolean;
  /** 锁定模式：对话已经开始，不允许切换人格（防止人格漂移） */
  locked?: boolean;
}

export function ModeSelector({
  current,
  onChange,
  disabled,
  locked,
}: ModeSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {(Object.keys(MODE_META) as ModeId[]).map((id) => {
        const meta = MODE_META[id];
        const active = current === id;
        // 非激活 + 被锁定 = 真正禁用（不可点）
        const lockedInactive = locked && !active;
        const btnDisabled = disabled || lockedInactive;
        return (
          <button
            key={id}
            type="button"
            onClick={() => !btnDisabled && onChange(id)}
            disabled={btnDisabled}
            title={
              lockedInactive
                ? "当前对话已锁定人格。想换？先点右上角「清空重开」"
                : undefined
            }
            className={[
              "group relative flex items-start gap-2 rounded-lg border px-3 py-3 sm:px-4 sm:py-3.5 text-left transition-all overflow-hidden",
              active
                ? `${meta.activeBorder} ${meta.activeBg} ${meta.glowClass}`
                : "border-xx-border bg-xx-bg-2 hover:border-xx-text-dim",
              lockedInactive ? "opacity-35 grayscale cursor-not-allowed" : "",
              disabled && !lockedInactive ? "cursor-not-allowed opacity-60" : "",
              !btnDisabled ? "cursor-pointer" : "",
            ].join(" ")}
          >
            {/* 文字区 */}
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={[
                    "h-2 w-2 rounded-full shrink-0",
                    active ? meta.dotColor : "bg-xx-border",
                  ].join(" ")}
                />
                <span
                  className={[
                    "mode-label",
                    active ? "text-white" : "text-xx-text",
                  ].join(" ")}
                >
                  {meta.label}
                </span>
                {/* 当前模式在锁定状态下加个小锁图标 */}
                {active && locked ? (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3 w-3 text-xx-gold shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-label="已锁定"
                  >
                    <rect x="5" y="11" width="14" height="9" rx="2" />
                    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                  </svg>
                ) : null}
              </div>
              <span
                className={[
                  "mode-subtitle",
                  active ? "text-xx-gold" : "text-xx-text-dim",
                ].join(" ")}
              >
                {meta.subtitle}
              </span>
            </div>

            {/* 右侧迷你头像 */}
            <div className="hidden sm:flex items-center self-center shrink-0">
              <MiniSilhouette mode={id} active={active} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

