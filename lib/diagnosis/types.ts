/**
 * 醒醒诊断书 · 类型定义
 *
 * 完全继承自 lib/prompts/_methodology/_diagnosis_template.md
 * 完全对齐 v0.8.0 接口约束（_diagnosis_template_full.md L244-L253）
 *
 * 数据流：
 *   1. 用户在 chat/stream 聊到信息饱和度满足
 *   2. 前端调 POST /api/diagnosis (TODO v0.8.x)
 *   3. 后端读 history → LLM 生成 JSON → 存 KV (TODO v0.8.x)
 *   4. 前端跳 /diagnosis/[id] 渲染本类型数据
 *
 * 当前 v0.7.9.7.8：仅静态展示页 + demo 数据（不接 LLM 不存 KV）
 */

import type { ModeId } from "@/lib/prompts";

// ============================================================
// 顶层 · 完整诊断书
// ============================================================

export interface DiagnosisReport {
  // 元数据
  id: string;
  sessionId: string;
  mode: ModeId;
  createdAt: number;
  generatedFromTurns: number;
  qProgress: number;
  /** v0.7.12.1：是否为"强行出 BP"（用户在被 gate 拦下后选择 force=true 时为 true） */
  forced?: boolean;

  // 进度表
  progress: ProgressTable;

  // 三章诊断
  parts: {
    business: PartContent; // PART 1 · Q1-Q8 商业逻辑层
    product: PartContent; // PART 2 · Q9-Q11 产品落地层
    founder: PartContent; // PART 3 · Q12 创始人体检层
  };

  // 醒醒裁决书
  verdict: Verdict;

  // 下次聊建议
  nextSession: NextSession;

  // 末尾金句卡（[KILL] 仪式）
  killQuote: string;
}

// ============================================================
// 进度表
// ============================================================

export interface ProgressTable {
  fullyCovered: QProgressItem[]; // ✅ 3/3 刀
  halfCovered: QProgressItem[]; // ⚠️ 1-2/3 刀
  notCovered: number[]; // ❌ 0/3 刀（题号数组）
}

export interface QProgressItem {
  questionId: number; // 1-12
  questionName: string; // "为谁做" / "解决什么真痛" 等
  userQuote: string; // 用户原话简引
  evaluation: string; // 醒醒评估（含"哪一刀没接住"等）
  bladesHit: number; // 已挥到的刀数（0-3）
}

// ============================================================
// 三章诊断单章
// ============================================================

export interface PartContent {
  title: string; // "PART 1 · 商业逻辑层"
  range: string; // "Q1-Q8"
  fullyCovered: QProgressItem[];
  halfCovered: QProgressItem[];
  notCovered: number[];
  intro?: string; // 该 PART 的开场白（如全空时的"你绕过了所有产品落地层的题..."）
}

// ============================================================
// 醒醒裁决书
// ============================================================

export type DiagnosisResult = "完善" | "聚焦" | "暂时存档";

export interface Verdict {
  summary: string; // 综合判断（按档位差异化措辞）
  diagnosis: DiagnosisResult; // 三种结果
  homework: string[]; // 3 件具体作业（含数字/名字/动作）
}

// ============================================================
// 下次聊建议
// ============================================================

export interface NextSession {
  primaryQs: number[]; // 主攻 Q 题号（1-2 个）
  blades: string[]; // 用刀（方法论名称）
  targetProgress: number; // 目标进度 M+3/12
}

// ============================================================
// 12 问题名速查表（与 lib/prompts/_methodology/_matrix_overview.md 对齐）
// ============================================================

export const Q_NAMES: Record<number, string> = {
  1: "为谁做",
  2: "解决什么真痛",
  3: "凭什么是你",
  4: "用户怎么找到你",
  5: "用户为什么留下",
  6: "怎么收钱",
  7: "成本结构",
  8: "靠谁兜底",
  9: "MVP 长什么样",
  10: "用户怎么用",
  11: "数据飞轮",
  12: "你这人靠不靠谱",
};

export const Q_LAYER: Record<number, "business" | "product" | "founder"> = {
  1: "business",
  2: "business",
  3: "business",
  4: "business",
  5: "business",
  6: "business",
  7: "business",
  8: "business",
  9: "product",
  10: "product",
  11: "product",
  12: "founder",
};

// ============================================================
// v0.7.12.0 新增 · Q 账本（QLedger）
//
// 用于把醒醒"心里过一遍"的 Q 进度从 prompt 升级为持久化真账本。
// 每轮主对话流式回复完成后，由轻量判官 LLM 异步推断本轮挥刀增量，
// 累计写入 KV `session:{id}:ledger`（TTL 90 天）。
//
// 与 ProgressTable 的区别：
//   - ProgressTable = 终态报告快照（生成诊断书时定格）
//   - QLedger       = 实时账本（每轮更新，用于驱动 BP 门槛 + UI 提示）
// ============================================================

export interface QLedgerEntry {
  questionId: number; // 1-12
  blades: number; // 0-3 已挥几把刀
  userQuotes: string[]; // 截至目前的用户原话片段（最多 3 条，每条 ≤ 80 字）
  lastUpdatedTurn: number; // 最后更新于第几轮
}

export interface QLedger {
  sessionId: string;
  mode: "casual" | "rational" | "scathing";
  totalTurns: number;
  entries: Record<number, QLedgerEntry>; // key = questionId 1-12
  fullyCovered: number[]; // blades === 3 的题号
  halfCovered: number[]; // blades 1-2 的题号
  notCovered: number[]; // blades === 0 的题号
  updatedAt: number;
}

/**
 * 判官 LLM 返回的本轮挥刀增量
 * - bladesIncrement 是「增量」（+1/+2），不是绝对值
 * - userQuote 是这一刀挥到的具体用户原话证据
 */
export interface LedgerIncrement {
  updates: Array<{
    questionId: number;
    bladesIncrement: number; // +1 / +2
    userQuote: string; // ≤ 80 字
  }>;
}
