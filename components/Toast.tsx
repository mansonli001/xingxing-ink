"use client";

/**
 * v0.7.9.6 · 御姐风格 Toast 组件
 *
 * 用途：
 *   - 重入提示（恢复历史时）
 *   - 切档提示（v0.7.9.7）
 *   - 网络/操作反馈
 *
 * 视觉：
 *   - 暗色磨砂底 + 主题色边框 + 主题色微发光
 *   - 右上角浮入（slide-in from right），3s 自动消失
 *   - 单 toast 模式（不堆叠，新的覆盖旧的）
 *
 * 用法：
 *   <Toast message="刚才聊到一半就跑了？" onClose={() => setToast(null)} />
 */

import { useEffect, useRef, useState } from "react";

export interface ToastProps {
  message: string;
  /** 自动关闭时长 ms，默认 3500 */
  duration?: number;
  /** 关闭回调 */
  onClose?: () => void;
}

export function Toast({ message, duration = 3500, onClose }: ToastProps) {
  // exiting 控制退出动画（0.25s 滑出后再调 onClose）
  const [exiting, setExiting] = useState(false);
  const exitedRef = useRef(false);

  useEffect(() => {
    const t1 = window.setTimeout(() => setExiting(true), duration);
    const t2 = window.setTimeout(() => {
      if (!exitedRef.current) {
        exitedRef.current = true;
        onClose?.();
      }
    }, duration + 280);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [duration, onClose]);

  function handleManualClose() {
    if (exitedRef.current) return;
    setExiting(true);
    window.setTimeout(() => {
      if (!exitedRef.current) {
        exitedRef.current = true;
        onClose?.();
      }
    }, 250);
  }

  return (
    <div
      className={["xx-toast", exiting ? "xx-toast-out" : ""].join(" ")}
      role="status"
      aria-live="polite"
      onClick={handleManualClose}
    >
      <span className="xx-toast-dot" aria-hidden="true" />
      <span className="xx-toast-text">{message}</span>
    </div>
  );
}
