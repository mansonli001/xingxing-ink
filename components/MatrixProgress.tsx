"use client";

/**
 * v0.7.9.6 · 12 问矩阵隐喻化进度
 *
 * 设计理念：用户拍板 Q2-A · 隐喻化展示
 *   - 4×3 暗色方块网格
 *   - 跟着 q_picker 命中数（0-12）逐个亮起
 *   - 不直白告诉用户"这是 Q Picker"
 *   - 无 tooltip / 无标签 / 无数字 / 仅视觉呼吸感
 *
 * 数据来源：后端 SSE meta 事件追加 q_progress 字段
 *
 * 视觉：
 *   - 亮起的方块：主题色填充 + 主题色发光
 *   - 暗方块：弱描边 + 极淡背景
 *   - 序数依次亮起（左→右、上→下）
 */

interface MatrixProgressProps {
  /** 已命中 Q 数量（0-12） */
  qProgress: number;
}

const TOTAL_BLOCKS = 12;

export function MatrixProgress({ qProgress }: MatrixProgressProps) {
  const lit = Math.max(0, Math.min(TOTAL_BLOCKS, Math.floor(qProgress)));

  return (
    <div className="xx-matrix" aria-hidden="true">
      {Array.from({ length: TOTAL_BLOCKS }, (_, i) => (
        <span
          key={i}
          className={[
            "xx-matrix-cell",
            i < lit ? "xx-matrix-cell-lit" : "",
          ].join(" ")}
          style={{
            // 错位入场延迟，让方块"逐一亮"——只对刚亮起的最后一个方块用更长延迟
            animationDelay: i < lit ? `${i * 40}ms` : "0ms",
          }}
        />
      ))}
    </div>
  );
}
