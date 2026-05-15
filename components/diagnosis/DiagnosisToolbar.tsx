"use client";

/**
 * 诊断书工具栏（客户端组件）· v0.7.9.10
 *
 * 设计逻辑：
 *   诊断书 = 用户在某个档位下聊出来的产物 → 档位已锁定，不可切换
 *   顶部右侧应当是「操作」而非「切换」
 *
 * 包含：
 *   1. 档位展示 pill（emoji + 档位名）
 *   2. 「保存长图」按钮 → 用 html2canvas 截整个 #diagnosis-snapshot DOM
 *
 * 使用方式：
 *   <DiagnosisToolbar mode="scathing" snapshotTargetId="diagnosis-snapshot" />
 *   - 父页面需把诊断书内容包在 <div id="diagnosis-snapshot"> 里
 */

import { useState } from "react";

type ModeId = "casual" | "rational" | "scathing" | "temperate" | "surgical";

interface ModeDisplay {
  emoji: string;
  label: string;
  pillClass: string;
}

const MODE_DISPLAY: Record<string, ModeDisplay> = {
  // 主产品三档
  casual: {
    emoji: "🌿",
    label: "随便聊档",
    pillClass: "bg-xx-purple/15 text-xx-purple border-xx-purple/40",
  },
  rational: {
    emoji: "❄️",
    label: "讲道理档",
    pillClass: "bg-xx-gold/10 text-xx-gold border-xx-gold/40",
  },
  scathing: {
    emoji: "🔥",
    label: "扇巴掌档",
    pillClass: "bg-xx-rose/15 text-xx-rose border-xx-rose/40",
  },
  // 诊断书三档（兼容）
  temperate: {
    emoji: "🌿",
    label: "温和档",
    pillClass: "bg-xx-purple/15 text-xx-purple border-xx-purple/40",
  },
  surgical: {
    emoji: "❄️",
    label: "手术刀档",
    pillClass: "bg-xx-gold/10 text-xx-gold border-xx-gold/40",
  },
};

interface DiagnosisToolbarProps {
  mode: string;
  snapshotTargetId: string;
}

export function DiagnosisToolbar({
  mode,
  snapshotTargetId,
}: DiagnosisToolbarProps) {
  const [saving, setSaving] = useState(false);
  const [savedHint, setSavedHint] = useState<string | null>(null);

  const display = MODE_DISPLAY[mode] ?? MODE_DISPLAY.scathing;

  async function handleSaveImage() {
    if (saving) return;
    const target = document.getElementById(snapshotTargetId);
    if (!target) {
      setSavedHint("找不到内容，刷新一下试试");
      setTimeout(() => setSavedHint(null), 2500);
      return;
    }
    setSaving(true);
    setSavedHint(null);

    try {
      // 动态加载 html2canvas，不进首屏 bundle
      const html2canvas = (await import("html2canvas")).default;

      const canvas = await html2canvas(target, {
        backgroundColor: "#0a0a0a",
        scale: 2, // 2x 高清，朋友圈看得清楚
        useCORS: true,
        logging: false,
        windowWidth: target.scrollWidth,
        windowHeight: target.scrollHeight,
      });

      // 转 blob 触发下载
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setSavedHint("生成失败，再试一次");
            setSaving(false);
            return;
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          const ts = new Date()
            .toISOString()
            .replace(/[:.]/g, "-")
            .slice(0, 19);
          a.download = `醒醒诊断书_${display.label}_${ts}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          setSavedHint("✓ 已保存到下载文件夹");
          setSaving(false);

          // 移动端微信浏览器特殊提示（无法直接下载）
          if (
            /MicroMessenger/i.test(navigator.userAgent) ||
            /iPhone|iPad/i.test(navigator.userAgent)
          ) {
            setSavedHint("✓ 长按图片保存到相册");
          }

          setTimeout(() => setSavedHint(null), 4000);
        },
        "image/png",
        1.0
      );
    } catch (err) {
      console.error("[DiagnosisToolbar] save image error", err);
      setSavedHint("生成失败，再试一次");
      setSaving(false);
      setTimeout(() => setSavedHint(null), 2500);
    }
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {/* 档位展示 pill（不可点）*/}
      <span
        className={[
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border font-display",
          display.pillClass,
        ].join(" ")}
        aria-label={`本次会诊档位：${display.label}`}
      >
        <span>{display.emoji}</span>
        <span>{display.label}</span>
      </span>

      {/* 保存长图按钮 */}
      <button
        type="button"
        onClick={handleSaveImage}
        disabled={saving}
        className={[
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border transition-all font-display",
          saving
            ? "border-xx-border-soft text-xx-text-dim cursor-wait"
            : "border-xx-border-soft text-xx-text-mid hover:border-xx-rose/60 hover:text-xx-rose hover:bg-xx-rose/5",
        ].join(" ")}
        aria-label="保存为长图"
      >
        {saving ? (
          <>
            <svg
              className="h-3 w-3 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" opacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
            <span>生成中…</span>
          </>
        ) : (
          <>
            <svg
              viewBox="0 0 24 24"
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span>保存长图</span>
          </>
        )}
      </button>

      {/* 状态提示（toast 风格 · 浮在按钮下方）*/}
      {savedHint ? (
        <span
          className="absolute top-full right-6 mt-2 px-3 py-1.5 rounded-lg bg-xx-bg-2 border border-xx-rose/40 text-xs text-xx-rose shadow-lg whitespace-nowrap"
          role="status"
        >
          {savedHint}
        </span>
      ) : null}
    </div>
  );
}
