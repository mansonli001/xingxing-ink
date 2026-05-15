/**
 * StatusChip · 诊断书三档状态徽章（v0.7.11.2 新增）
 *
 * 替代原来的 ✅⚠️❌ emoji（用户反馈"太 AI 了"）
 *
 * 设计：方案 C 彩色徽章 chip
 *   - 圆角胶囊 rounded-full
 *   - 内部 1.5×1.5px 圆点（对应状态色）
 *   - 右侧标签文字（细字距）
 *   - 浅色半透明背景 + 同色描边
 *
 * 视觉规范沿用项目主题色：
 *   - fully  已聊透 → emerald-400 系
 *   - half   半聊到 → amber-400 系
 *   - none   没聊   → xx-red-deep 系
 */

import type { ReactNode } from "react";

type ChipStatus = "fully" | "half" | "none";

const STATUS_STYLE: Record<
  ChipStatus,
  { dot: string; chip: string; label: string }
> = {
  fully: {
    dot: "bg-emerald-400",
    chip: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    label: "已聊透",
  },
  half: {
    dot: "bg-amber-400",
    chip: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    label: "半聊到",
  },
  none: {
    dot: "bg-xx-red-deep",
    chip: "bg-xx-red-deep/10 text-xx-red-deep border-xx-red-deep/30",
    label: "没聊",
  },
};

interface Props {
  status: ChipStatus;
  /** 自定义文字（默认走 STATUS_STYLE 里的 label） */
  children?: ReactNode;
  /** 右侧附加内容（如 X/Y 计数） */
  suffix?: ReactNode;
}

export function StatusChip({ status, children, suffix }: Props) {
  const style = STATUS_STYLE[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border tracking-widest ${style.chip}`}
    >
      <span
        aria-hidden="true"
        className={`inline-block w-1.5 h-1.5 rounded-full ${style.dot}`}
      />
      <span>{children ?? style.label}</span>
      {suffix && <span className="opacity-70">· {suffix}</span>}
    </span>
  );
}
