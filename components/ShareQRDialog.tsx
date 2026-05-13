"use client";

/**
 * v0.7.9.7.3 · 分享二维码弹窗
 *
 * v2 → v3 修复：
 *   1. 手机端点遮罩无法关闭 → 同时监听 onPointerDown / onClick 双兜底
 *   2. 桌面端也只能 ESC 关闭 → onClick 事件在某些嵌套下 e.target 判断失败，改用 data-overlay 属性精准匹配
 *   3. 二维码长按无系统菜单 → 移除可能阻断原生菜单的 pointer-events/user-select，加 draggable="true" 允许长按
 *   4. 手机端显示不全 → 外层用 100dvh 兜底 + 卡片 max-height 限制 + overflow-auto
 *
 * 文案（v3 文案再收敛，更直接）：
 *   - 标题：扫码分享给朋友
 *   - 描述：长按二维码保存 · 或扫码发给朋友
 */

import { useEffect, useState } from "react";

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

  useEffect(() => {
    if (!open) return;
    if (typeof window !== "undefined") {
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL || "https://xingxing.starfluxes.com";
      setCurrentUrl(siteUrl);
    }
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  // v0.7.9.7.3：body 滚动锁定，防止弹窗打开时背景滚动
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

  // v0.7.9.7.3 · 点遮罩关闭（双事件兜底 · 桌面+移动端都 work）
  // 用 data-overlay 属性判定：只有点到遮罩层本身才关闭，点卡片内不关
  function handleOverlayTap(e: React.SyntheticEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target.dataset.overlay === "true") {
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
        onClick={handleOverlayTap}
        onTouchEnd={handleOverlayTap}
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
              // v0.7.9.7.3：解锁长按系统菜单
              // draggable=true + 无 pointer-events 阻断 → 移动端长按弹"保存图片/分享/复制"
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
