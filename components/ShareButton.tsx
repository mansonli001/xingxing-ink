"use client";

/**
 * v0.7.9.7.2 · 分享按钮（输入框右上角小图标）
 *
 * 设计：
 *   - 24×24 SVG 二维码图标（细线条，主题色）
 *   - hover/focus 时主题色发光 + 微抬升
 *   - 点击弹 ShareQRDialog
 *   - 任何环境都显示（不做 UA 检测）
 *
 * 用途：
 *   - 嵌入到 Chat.tsx 的输入框上方右侧
 *   - 取代之前 WeixinGuide 顶部红条
 *
 * 设计意图：
 *   - 微信用户来这里就好好聊，不主动赶走
 *   - 用户想"分享给朋友"时再点小图标
 *   - 文案改为"扫码分享给朋友"（不是"在浏览器打开"）
 */

import { useState } from "react";
import { ShareQRDialog } from "./ShareQRDialog";

interface ShareButtonProps {
  /** 可选：覆盖默认 className（外层定位用） */
  className?: string;
}

export function ShareButton({ className = "" }: ShareButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={`share-btn ${className}`}
        onClick={(e) => {
          // v0.7.9.7.5：阻止 click 冒泡，防止弹窗渲染后该 click 被 overlay 捕获 → 立刻关闭
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
        aria-label="扫码分享给朋友"
        title="扫码分享"
      >
        {/* 二维码图标 SVG */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <line x1="14" y1="14" x2="17" y2="14" />
          <line x1="20" y1="14" x2="20" y2="14" />
          <line x1="14" y1="17" x2="14" y2="20" />
          <line x1="17" y1="17" x2="17" y2="17" />
          <line x1="20" y1="17" x2="20" y2="20" />
          <line x1="17" y1="20" x2="20" y2="20" />
        </svg>
      </button>
      <ShareQRDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
