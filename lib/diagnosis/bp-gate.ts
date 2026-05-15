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

import { Q_NAMES, type QLedger } from "./types";

export interface MissingQuestion {
  /** 题号 1-12 */
  qid: number;
  /** 题名（如「凭什么是你」） */
  name: string;
  /** 当前挥到几刀（0 表示完全没聊） */
  blades: number;
  /** 优先级（数值越小越优先追问） */
  priority: number;
}

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
  /** v0.7.12.1：最缺的 1-2 题，给前端弹气泡和 bridge API 用 */
  missingQuestions: MissingQuestion[];
}

/** 最低门槛 · 可调 */
const MIN_TURNS = 6;
const MIN_COVERAGE = 4;

/**
 * 12 题追问优先级（数值越小越优先）
 *
 * 设计原则（外部评测意见 #15 同源）：
 * - Q1（为谁做）/ Q2（真痛）/ Q4（获客）/ Q6（收钱）= 商业地基题，最优先
 * - Q3（凭什么是你）/ Q5（留存）/ Q7（成本）= 二级商业题
 * - Q9-Q11 = 产品落地题，再次
 * - Q8（伙伴）/ Q12（创始人）= 边角题，最后
 *
 * 任意一题 blades=0 时优先追；都 blades=0 时按下面顺序。
 */
const Q_PRIORITY: Record<number, number> = {
  1: 1, // 为谁做
  2: 2, // 真痛
  4: 3, // 获客
  6: 4, // 收钱
  3: 5, // 凭什么是你
  5: 6, // 留存
  7: 7, // 成本
  9: 8, // MVP
  10: 9, // 用户怎么用
  11: 10, // 数据飞轮
  8: 11, // 伙伴
  12: 12, // 创始人体检
};

/**
 * v0.7.12.1：返回最缺的 1-2 题
 *
 * 策略：
 * 1. 优先选 blades=0 的题（完全没聊到）
 * 2. blades=0 题不足 2 道时，补 blades=1 的（聊得很浅）
 * 3. 按 Q_PRIORITY 排序，最多返回 2 题
 */
export function getMissingQuestions(
  ledger: QLedger | null
): MissingQuestion[] {
  if (!ledger) {
    // 账本不存在 → 默认推 Q1+Q2（地基双题）
    return [
      { qid: 1, name: Q_NAMES[1], blades: 0, priority: 1 },
      { qid: 2, name: Q_NAMES[2], blades: 0, priority: 2 },
    ];
  }

  // 收集所有未聊透题（blades < 3）的 qid + blades
  const candidates: MissingQuestion[] = [];
  for (let qid = 1; qid <= 12; qid++) {
    const entry = ledger.entries[qid];
    const blades = entry?.blades ?? 0;
    if (blades < 3) {
      candidates.push({
        qid,
        name: Q_NAMES[qid] ?? `Q${qid}`,
        blades,
        priority: Q_PRIORITY[qid] ?? 99,
      });
    }
  }

  // 排序：先按 blades 升序（0 优先），再按 priority 升序
  candidates.sort((a, b) => {
    if (a.blades !== b.blades) return a.blades - b.blades;
    return a.priority - b.priority;
  });

  return candidates.slice(0, 2);
}

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

  const missingQuestions = eligible ? [] : getMissingQuestions(ledger);

  return {
    eligible,
    missingRounds,
    missingCoverage,
    currentTurns: turnCount,
    currentCoverage,
    message: buildMessage(missingRounds, missingCoverage, missingQuestions),
    missingQuestions,
  };
}

/**
 * 构造"再聊 N 块拼图"友好提示。
 * 四种情况：
 *   - 都不缺（兜底） → "够格了——出 BP"
 *   - 都缺 → "再聊 R 轮 · 还有 X / Y 没问到"
 *   - 只缺轮数 → "再聊 R 轮"
 *   - 只缺覆盖 → 露出最缺的题名（v0.7.12.1：不再是模糊"N 块拼图"）
 */
function buildMessage(
  missingRounds: number,
  missingCoverage: number,
  missingQuestions: MissingQuestion[]
): string {
  if (missingRounds === 0 && missingCoverage === 0) {
    return "够格了——姐这就给你写诊断书。";
  }

  // 拼接最缺的 1-2 题的题名（用人话，不露 Q 编号）
  const topicNames = missingQuestions
    .slice(0, 2)
    .map((q) => `「${q.name}」`)
    .join(" + ");

  if (missingRounds > 0 && missingCoverage > 0) {
    return topicNames
      ? `再聊 ${missingRounds} 轮 · 姐还想问 ${topicNames}，写完再给你诊断书。`
      : `再聊 ${missingRounds} 轮 · 再补 ${missingCoverage} 块拼图，姐才能写狠一点的诊断书。`;
  }
  if (missingRounds > 0) {
    return `再聊 ${missingRounds} 轮，姐才能给你写一份能看的诊断书。`;
  }
  // 只缺覆盖 —— 这是 11 轮被拦的真实场景，必须露题名
  return topicNames
    ? `姐还有 ${topicNames} 没问到呢——把这俩说清楚，姐立刻给你写诊断书。`
    : `再补 ${missingCoverage} 块拼图，姐才能写透。`;
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
