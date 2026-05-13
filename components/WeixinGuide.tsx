"use client";

/**
 * v0.7.9.7 · 微信内置浏览器引导组件
 *
 * 仅在 navigator.userAgent 命中 MicroMessenger 时渲染。
 * 包含两层引导：
 *   A · 顶部条：常驻引导横条 + 三个 CTA（用浏览器打开 / 复制链接 / 二维码）
 *   C · 二维码弹窗：点"二维码"打开，居中卡片 + QR 图 + URL 文本 + 关闭
 *
 * 设计原则：
 *   - 不阻断主流程（顶部条不可关闭，但下方 ChatShell 仍可正常使用）
 *   - 三个 CTA 任选一个都能"完成迁移到外部浏览器"目标
 *   - 暗血红渐变 + 御姐风格文案，不破坏品牌调性
 *   - QR 用第三方公开 API（qrserver.com）生成 SVG，不引入新依赖；失败时 URL 文本兜底
 *
 * UA 检测策略：
 *   - 使用 navigator.userAgent.toLowerCase() 检测 'micromessenger'
 *   - SSR 阶段返回 null（避免 hydration mismatch）
 *   - hydrate 后 useEffect 检测，命中才渲染
 */

import { useEffect, useState } from "react";

/** 当前页面 URL（hydrate 后从 window.location 读，SSR 时为空） */
function getCurrentUrl(): string {
  if (typeof window === "undefined") return "";
  return window.location.href;
}

/** 二维码 API：用 qrserver.com 公开 API 生成 SVG，参数为目标 URL */
function buildQrUrl(targetUrl: string): string {
  const encoded = encodeURIComponent(targetUrl);
  return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&format=svg&margin=8&data=${encoded}`;
}

/** 检测是否在微信内置浏览器 */
function isInWeixin(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes("micromessenger");
}

export function WeixinGuide() {
  const [isWeixin, setIsWeixin] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState("");

  // hydrate 后做 UA 检测（SSR 阶段不渲染）
  useEffect(() => {
    if (isInWeixin()) {
      setIsWeixin(true);
      setCurrentUrl(getCurrentUrl());
    }
  }, []);

  // toast 自动消失
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!isWeixin) return null;

  // 复制链接
  async function handleCopy() {
    if (!navigator.clipboard) {
      setToast("浏览器不支持自动复制 · 请长按选择");
      return;
    }
    const ok = await navigator.clipboard.writeText(currentUrl).then(
      () => true,
      () => false
    );
    setToast(ok ? "链接已复制 · 粘到 Safari/Chrome 打开" : "复制失败 · 请手动选择");
  }

  // "用浏览器打开" → 引导用户点右上角菜单
  function handleHowToOpen() {
    setToast("点右上角的「···」 → 选「在浏览器中打开」");
  }

  return (
    <>
      {/* A · 顶部引导条 */}
      <div className="wx-guide-bar" role="banner" aria-label="微信内置浏览器引导">
        <div className="wx-guide-bar-text">
          <strong>姐这里在浏览器打开才完整 ——</strong>
          {" "}微信里有点功能跑不动。
        </div>
        <div className="wx-guide-actions">
          <button
            type="button"
            className="wx-guide-btn"
            onClick={handleHowToOpen}
            aria-label="如何用浏览器打开"
          >
            浏览器打开
          </button>
          <button
            type="button"
            className="wx-guide-btn"
            onClick={handleCopy}
            aria-label="复制链接"
          >
            复制链接
          </button>
          <button
            type="button"
            className="wx-guide-btn"
            onClick={() => setShowQR(true)}
            aria-label="显示二维码"
          >
            二维码
          </button>
        </div>
      </div>

      {/* C · 二维码弹窗 */}
      {showQR ? (
        <div
          className="wx-qr-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="扫码用浏览器打开"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowQR(false);
          }}
        >
          <div className="wx-qr-card">
            <div className="wx-qr-title">扫码用浏览器打开</div>
            <div className="wx-qr-desc">
              截屏保存二维码，<br />在系统相册里长按 → 识别后用浏览器打开
            </div>
            {currentUrl ? (
              <img
                className="wx-qr-svg"
                src={buildQrUrl(currentUrl)}
                alt="醒醒访问二维码"
                width={200}
                height={200}
              />
            ) : null}
            <div className="wx-qr-url">{currentUrl}</div>
            <button
              type="button"
              className="wx-qr-close"
              onClick={() => setShowQR(false)}
            >
              关闭
            </button>
          </div>
        </div>
      ) : null}

      {/* Toast 浮动提示（复制成功 / 教学引导） */}
      {toast ? <div className="wx-qr-toast" role="status">{toast}</div> : null}
    </>
  );
}
