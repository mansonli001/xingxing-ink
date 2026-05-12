"use client";

/**
 * v0.7.9.6 · 抽屉式侧栏（框架版）
 *
 * 设计：
 *   - 默认隐藏，左上角小图标点开
 *   - 桌面：从左滑入 280px
 *   - 移动：全屏覆盖
 *   - 暗色磨砂底 + 主题色微发光
 *
 * 内容（本批次为框架）：
 *   - 顶部：当前会话信息
 *   - 中部："会话历史"占位（v0.7.9.7 接 useChatPersistence 多桶接口）
 *   - 底部：12 问矩阵隐喻进度（MatrixProgress 组件）
 *
 * 触发：ChatShell 维护 drawerOpen state，通过 children 暴露 trigger 给 Chat 顶部
 */

import { useEffect } from "react";
import { MatrixProgress } from "./MatrixProgress";

interface SideDrawerProps {
  open: boolean;
  onClose: () => void;
  /** 12 问命中数（0-12），用于矩阵进度 */
  qProgress: number;
  /** 当前总轮数 */
  turnCount: number;
}

export function SideDrawer({
  open,
  onClose,
  qProgress,
  turnCount,
}: SideDrawerProps) {
  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // 锁页面滚动
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {/* 遮罩 */}
      <div
        className={["xx-drawer-overlay", open ? "xx-drawer-overlay-open" : ""].join(" ")}
        onClick={onClose}
        aria-hidden={!open}
      />
      {/* 抽屉本体 */}
      <aside
        className={["xx-drawer", open ? "xx-drawer-open" : ""].join(" ")}
        aria-hidden={!open}
        role="dialog"
        aria-label="侧栏 · 会话历史与进度"
      >
        <div className="xx-drawer-header">
          <h3 className="xx-drawer-title">姐替你熬过的</h3>
          <button
            type="button"
            className="xx-drawer-close"
            onClick={onClose}
            aria-label="关闭侧栏"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="xx-drawer-body">
          {/* 当前会话 · v0.7.9.7 改为分桶卡片列表 */}
          <div className="xx-drawer-section">
            <div className="xx-drawer-section-label">当前</div>
            <div className="xx-drawer-card xx-drawer-card-current">
              <div className="xx-drawer-card-mode">
                <span className="xx-drawer-card-dot" />
                正在和姐过招
              </div>
              <div className="xx-drawer-card-meta">
                {turnCount > 0
                  ? `已聊 ${turnCount} 轮`
                  : "还没开始 · 给个想法看看"}
              </div>
            </div>
          </div>

          {/* 会话历史占位（v0.7.9.7 接持久化多桶） */}
          <div className="xx-drawer-section">
            <div className="xx-drawer-section-label">熬过的项目</div>
            <div className="xx-drawer-empty">
              <span>v0.7.9.7 上线后</span>
              <span className="xx-drawer-empty-sub">这里会列出三档分别的对话历史</span>
            </div>
          </div>
        </div>

        {/* 底部：12 问矩阵进度 · 隐喻化（无 tooltip 无标签） */}
        <div className="xx-drawer-footer">
          <MatrixProgress qProgress={qProgress} />
        </div>
      </aside>
    </>
  );
}

/**
 * 抽屉触发按钮 · 左上角小图标
 * 在 Chat.tsx 顶部状态栏左侧使用
 */
export function DrawerTriggerButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="xx-drawer-trigger"
      onClick={onClick}
      aria-label="打开侧栏"
      title="姐替你熬过的"
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
  );
}
