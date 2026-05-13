"use client";

/**
 * v0.7.9.7.5 · 分享二维码弹窗 · 终极修复版
 *
 * v3/v4 bug：点 ShareButton 弹窗立刻被关掉（桌面 + 手机都有）
 *   根因：ShareButton click → setOpen(true) → 弹窗渲染 → 同一次 click 继续冒泡
 *         → overlay 的 click 被触发 → onClose() 立刻执行
 *         虽然 ShareButton 已加 stopPropagation，但 React 合成事件 + 某些浏览器
 *         行为下仍可能发生首帧误触
 *
 * v5 终极修复：
 *   1. 用 onPointerDown 代替 onClick（pointer 事件 pointerId 可精确匹配 down/up 配对）
 *   2. 100ms 激活延迟：弹窗打开后前 100ms 不响应遮罩关闭（让首帧冒泡事件过去）
 *   3. Pointer down on overlay → 记录 pointerId → pointer up 时验证是同一个 pointerId
 *      且没 move 过（避免滑动误触）
 *   4. 保留 ESC 键和关闭按钮兜底
 */

import { useEffect, useRef, useState } from "react";

interface ShareQRDialogProps {
  open: boolean;
  onClose: () => void;
}

function buildQrUrl(targetUrl: string): string {
  const encoded = encodeURIComponent(targetUrl);
  return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&format=svg&margin=8&data=${encoded}`;
}

export function ShareQRDialog({ open, onClose }: ShareQRDialogProps) {
  const [currentUrl, setCurrentUrl] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  // v0.7.9.7.5：弹窗是否已过"冷却期"可响应遮罩关闭
  const [readyToClose, setReadyToClose] = useState(false);
  // pointerdown 发生在 overlay 上的 pointerId，pointerup 必须匹配才算真正点了遮罩
  const pointerDownOnOverlayRef = useRef<number | null>(null);

  // 弹窗打开时读取 URL + 启动 100ms 冷却期
  useEffect(() => {
    if (!open) {
      setReadyToClose(false);
      pointerDownOnOverlayRef.current = null;
      return;
    }
    if (typeof window !== "undefined") {
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL || "https://xingxing.starfluxes.com";
      setCurrentUrl(siteUrl);
    }
    // 100ms 后才允许遮罩关闭（防首帧冒泡误触）
    const timer = setTimeout(() => setReadyToClose(true), 120);
    return () => clearTimeout(timer);
  }, [open]);

  // toast 自动消失
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  // ESC 键关闭
  useEffect(() => {
    if (!open) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  // body 滚动锁定
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  async function handleCopy() {
    if (!navigator.clipboard) {
      setToast("浏览器不支持自动复制 · 长按链接选择");
      return;
    }
    const ok = await navigator.clipboard.writeText(currentUrl).then(
      () => true,
      () => false
    );
    setToast(ok ? "链接已复制 · 发给朋友吧" : "复制失败 · 长按链接选择");
  }

  /**
   * v0.7.9.7.5 · 遮罩关闭逻辑（pointerdown + pointerup 配对）
   *
   * 步骤：
   *   1. pointerdown 落在 overlay 上 → 记录 pointerId
   *   2. pointerup 时：pointerId 匹配 + 目标还是 overlay = 真点遮罩 → 关闭
   *   3. 如果 pointerdown 落在卡片上 → 不记录 → pointerup 不会触发关闭
   *   4. 如果按住在 overlay 滑到卡片再松开 → pointerId 匹配但 target ≠ overlay → 不关
   */
  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!readyToClose) return; // 冷却期不响应
    const target = e.target as HTMLElement;
    if (target.dataset.overlay === "true") {
      pointerDownOnOverlayRef.current = e.pointerId;
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!readyToClose) {
      pointerDownOnOverlayRef.current = null;
      return;
    }
    const target = e.target as HTMLElement;
    const started = pointerDownOnOverlayRef.current;
    pointerDownOnOverlayRef.current = null;
    // down 和 up 都在 overlay 上 → 真点遮罩 → 关闭
    if (started === e.pointerId && target.dataset.overlay === "true") {
      onClose();
    }
  }

  return (
    <>
      <div
        className="wx-qr-overlay"
        data-overlay="true"
        role="dialog"
        aria-modal="true"
        aria-label="扫码分享给朋友"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        <div className="wx-qr-card">
          <div className="wx-qr-title">扫码分享给朋友</div>
          <div className="wx-qr-desc">
            长按二维码保存 · 或让朋友扫码
          </div>
          {currentUrl ? (
            <img
              className="wx-qr-svg"
              src={buildQrUrl(currentUrl)}
              alt="醒醒分享二维码"
              width={200}
              height={200}
              draggable
            />
          ) : null}
          <div className="wx-qr-url">{currentUrl}</div>
          <div className="wx-qr-actions">
            <button
              type="button"
              className="wx-qr-secondary"
              onClick={handleCopy}
              aria-label="复制链接"
            >
              复制链接
            </button>
            <button
              type="button"
              className="wx-qr-close"
              onClick={onClose}
              aria-label="关闭"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
      {toast ? (
        <div className="wx-qr-toast" role="status">
          {toast}
        </div>
      ) : null}
    </>
  );
}
