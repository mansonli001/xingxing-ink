/**
 * 醒醒 · BP 生成门槛检查（v0.7.12.0 新增）
 *
 * 解决问题（外部专家评测意见 #10）：
 *   现状：≥2 轮就允许出 BP → 易产生空洞诊断书 → 用户晒不出去 → 0 传播
 *   目标：≥6 轮 且 fullyCovered+halfCovered≥4 才允许生成"值得晒的 BP"
 *
 * 不达标时由 generate route 返回 422 + friendly error，前端展示
 * 「再聊 N 块拼图，姐能写狠一点的诊断书」（不露 Q 编号）。
 *
 * 注意：本模块只决定"够不够格"，不决定"该不该生成"——
 *      用户硬要可绕过（例如未来管理员模式），但默认前端按钮会灰掉。
 */

import type { QLedger } from "./types";

export interface BPEligibilityResult {
  /** 是否够格生成诊断书 */
  eligible: boolean;
  /** 还需要再聊几轮（轮数差） */
  missingRounds: number;
  /** 还需要再补几块拼图（覆盖度差） */
  missingCoverage: number;
  /** 当前已聊几轮 */
  currentTurns: number;
  /** 当前有效覆盖（fullyCovered + halfCovered 题数） */
  currentCoverage: number;
  /** 友好提示文案（前端可直接展示，不露 Q 编号） */
  message: string;
}

/** 最低门槛 · 可调 */
const MIN_TURNS = 6;
const MIN_COVERAGE = 4;

/**
 * 检查是否够格生成 BP。
 *
 * @param turnCount 当前总轮数（user 消息条数）
 * @param ledger 当前会话 ledger（null 表示账本还没建立 → 走最严判定）
 */
export function checkBPEligibility(
  turnCount: number,
  ledger: QLedger | null
): BPEligibilityResult {
  const currentCoverage = ledger
    ? ledger.fullyCovered.length + ledger.halfCovered.length
    : 0;

  const missingRounds = Math.max(0, MIN_TURNS - turnCount);
  const missingCoverage = Math.max(0, MIN_COVERAGE - currentCoverage);

  const eligible = missingRounds === 0 && missingCoverage === 0;

  return {
    eligible,
    missingRounds,
    missingCoverage,
    currentTurns: turnCount,
    currentCoverage,
    message: buildMessage(missingRounds, missingCoverage),
  };
}

/**
 * 构造"再聊 N 块拼图"友好提示。
 * 三种情况：
 *   - 都缺 → "再聊 R 轮 · 再补 C 块拼图"
 *   - 只缺轮数 → "再聊 R 轮"
 *   - 只缺覆盖 → "再补 C 块拼图"
 *   - 都不缺（兜底） → "够格了——出 BP"
 */
function buildMessage(missingRounds: number, missingCoverage: number): string {
  if (missingRounds === 0 && missingCoverage === 0) {
    return "够格了——姐这就给你写诊断书。";
  }
  if (missingRounds > 0 && missingCoverage > 0) {
    return `再聊 ${missingRounds} 轮 · 再补 ${missingCoverage} 块拼图，姐才能写狠一点的诊断书。`;
  }
  if (missingRounds > 0) {
    return `再聊 ${missingRounds} 轮，姐才能给你写一份能看的诊断书。`;
  }
  return `再补 ${missingCoverage} 块拼图（具体场景/数字/名字），姐才能写透。`;
}

/**
 * 给 chat UI 用的"软提示"——即使还没生成 BP 也能在第 3/6/9 轮给个进度提醒。
 * 与 checkBPEligibility 区别：本函数只算"还差几块"用于 toast，
 * 不返回 eligible 字段（toast 永远显示，与门槛无关）。
 */
export function describeRemainingPieces(ledger: QLedger | null): string {
  const currentCoverage = ledger
    ? ledger.fullyCovered.length + ledger.halfCovered.length
    : 0;
  const missing = Math.max(0, MIN_COVERAGE - currentCoverage);
  if (missing === 0) {
    return "姐手里的拼图够了，随时能给你写诊断书。";
  }
  return `姐还差 ${missing} 块拼图，写得透才不浪费这场聊。`;
}
