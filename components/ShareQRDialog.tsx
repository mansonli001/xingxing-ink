"use client";

/**
 * v0.7.9.7.2 · 分享二维码弹窗
 *
 * 用途：
 *   - 用户点输入框右上角小图标 → 弹此弹窗
 *   - 任何环境都能用（不再做 UA 检测，微信内/外都同一行为）
 *
 * 文案：
 *   - 标题：扫码分享给朋友
 *   - 描述：截屏发出去 / 截屏让朋友扫
 *   - 不再有"在浏览器打开"的引导（用户已经在用了，不需要赶走）
 *
 * QR 实现：
 *   - 用 qrserver.com 公开 API 生成 SVG（0 新增依赖）
 *   - 失败时 URL 文本兜底（用户可以长按文本复制）
 *
 * 设计：
 *   - 暗色磨砂底 + 玫瑰金边框（不是暗血红，避免警告感）
 *   - 居中卡片 + 200×200 QR + 关闭按钮
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

  // 弹窗打开时读取当前 URL
  useEffect(() => {
    if (!open) return;
    if (typeof window !== "undefined") {
      // 优先用环境变量配置的 SITE_URL（保证分享链接是正式域名而非 vercel 预览）
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL || "https://xingxing.starfluxes.com";
      setCurrentUrl(siteUrl);
    }
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

  return (
    <>
      <div
        className="wx-qr-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="扫码分享给朋友"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="wx-qr-card">
          <div className="wx-qr-title">扫码分享给朋友</div>
          <div className="wx-qr-desc">
            截屏发给朋友，让 ta 也来被姐怼一下
          </div>
          {currentUrl ? (
            <img
              className="wx-qr-svg"
              src={buildQrUrl(currentUrl)}
              alt="醒醒分享二维码"
              width={200}
              height={200}
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
