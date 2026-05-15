/**
 * 醒醒 · Q 账本核心模块（v0.7.12.0 新增）
 *
 * 职责：
 *   1. hasUserFact —— 规则版"用户消息是否带事实"检测（防 qProgress 虚高 bug）
 *   2. makeEmptyLedger —— 工厂：创建一份空账本（12 题全 notCovered）
 *   3. mergeIncrement —— 把判官 LLM 返回的本轮增量合并进旧账本
 *   4. computeNewlyFullyCovered —— diff old/new，返回新晋"聊透"题号数组
 *   5. loadLedger / saveLedger —— KV 读写（90 天 TTL）
 *
 * 全部纯函数 + 一次 KV 调用，便于单测与 fire-and-forget 异步使用。
 *
 * 设计原则：
 *   - 所有写入幂等：blades 上限 3，userQuotes 限长 3 条
 *   - 失败由调用方处理（本模块不吞异常），KV 层失败时上抛便于日志统一处理
 *   - 不依赖 prompt / Methodology，只做数据结构操作
 */

import {
  K_SESSION_LEDGER,
  SESSION_LEDGER_TTL_SECONDS,
} from "@/lib/stats/keys";
import type { ModeId } from "@/lib/prompts";
import type {
  QLedger,
  QLedgerEntry,
  LedgerIncrement,
} from "./types";

// =========================================================================
// 1. hasUserFact —— 用户消息是否带"事实"
// =========================================================================

/**
 * 规则版"事实检测"——判官 LLM 升级 blades 前的硬门槛。
 *
 * 判定为 fact 至少满足下面 1 条：
 *   a) 含数字（含中文数字）：3 / 23岁 / ¥199 / 月入 5 千 / 三个月
 *   b) 长度 ≥ 30 字（认真回答的体感最低门槛）
 *   c) 含"具体动词/名词"：做了/用过/付过/客户/月入/年龄/CAC/LTV/朋友圈/抖音/小红书 等
 *
 * 防御场景：用户只回 A/B/C / 嗯 / 不知道 / 没想过 → 不算 fact，
 * 这一刀只算"提到"不能升级 blades，避免 qProgress 虚高。
 */
export function hasUserFact(message: string): boolean {
  if (!message) return false;
  const trimmed = message.trim();
  if (trimmed.length === 0) return false;

  // a) 含阿拉伯/中文数字
  if (/\d/.test(trimmed)) return true;
  if (/[一二三四五六七八九十百千万亿]/.test(trimmed)) return true;

  // b) 长度 ≥ 30 字（CJK 字符计 1）
  if (trimmed.length >= 30) return true;

  // c) 含具体动词/名词（专有词典）
  const factKeywords = [
    // 动作动词
    "做过", "做了", "用过", "用了", "试过", "测过", "搜过",
    "付过", "付了", "卖过", "卖了", "见过", "聊过", "调研过",
    // 量化名词
    "客户", "用户", "会员", "粉丝", "群友", "同事", "朋友圈",
    "年龄", "月入", "薪资", "工资", "学历", "职业", "城市",
    // 商业概念
    "CAC", "LTV", "ARPU", "GMV", "ROI", "DAU", "MAU", "PMF",
    "渠道", "投流", "复购", "订阅", "付费", "免费", "转化",
    // 平台
    "抖音", "小红书", "微信", "微博", "B站", "知乎", "公众号",
    "Character.AI", "Replika", "ChatGPT", "豆包", "星野",
  ];
  return factKeywords.some((kw) => trimmed.includes(kw));
}

// =========================================================================
// 2. makeEmptyLedger —— 工厂
// =========================================================================

export function makeEmptyLedger(
  sessionId: string,
  mode: ModeId,
  totalTurns: number = 0
): QLedger {
  const entries: Record<number, QLedgerEntry> = {};
  for (let qid = 1; qid <= 12; qid++) {
    entries[qid] = {
      questionId: qid,
      blades: 0,
      userQuotes: [],
      lastUpdatedTurn: 0,
    };
  }
  return {
    sessionId,
    mode,
    totalTurns,
    entries,
    fullyCovered: [],
    halfCovered: [],
    notCovered: Array.from({ length: 12 }, (_, i) => i + 1),
    updatedAt: Date.now(),
  };
}

// =========================================================================
// 3. mergeIncrement —— 合并判官增量到旧账本
// =========================================================================

/**
 * 把判官返回的本轮增量合并进旧账本。
 *
 * 关键约束：
 *   - blades 上限 3，超过封顶（防止判官重复给同一刀加分）
 *   - userQuotes 同 questionId 最多 3 条，每条 ≤ 80 字（截断加省略号）
 *   - 重新计算 fullyCovered / halfCovered / notCovered 三组分类
 *   - totalTurns 由调用方传入新值（不在本函数推断）
 *
 * 返回新账本（不修改入参，便于函数式使用）。
 */
export function mergeIncrement(
  oldLedger: QLedger,
  increment: LedgerIncrement,
  newTotalTurns: number
): QLedger {
  // 深拷贝 entries
  const newEntries: Record<number, QLedgerEntry> = {};
  for (const qid of Object.keys(oldLedger.entries)) {
    const e = oldLedger.entries[Number(qid)];
    newEntries[Number(qid)] = {
      ...e,
      userQuotes: [...e.userQuotes],
    };
  }

  // 应用增量
  for (const u of increment.updates ?? []) {
    if (
      typeof u.questionId !== "number" ||
      u.questionId < 1 ||
      u.questionId > 12
    )
      continue;
    const e = newEntries[u.questionId];
    if (!e) continue;

    // blades 升级（有上限 3）
    if (typeof u.bladesIncrement === "number" && u.bladesIncrement > 0) {
      e.blades = Math.min(3, e.blades + u.bladesIncrement);
      e.lastUpdatedTurn = newTotalTurns;
    }

    // userQuote 追加（截断到 80 字 + 限保留最近 3 条）
    if (u.userQuote && typeof u.userQuote === "string") {
      const trimmed = u.userQuote.trim();
      if (trimmed.length > 0) {
        const quote =
          trimmed.length > 80 ? trimmed.slice(0, 79) + "…" : trimmed;
        e.userQuotes.push(quote);
        if (e.userQuotes.length > 3) {
          e.userQuotes = e.userQuotes.slice(-3);
        }
      }
    }
  }

  // 重算分类
  const fullyCovered: number[] = [];
  const halfCovered: number[] = [];
  const notCovered: number[] = [];
  for (let qid = 1; qid <= 12; qid++) {
    const b = newEntries[qid].blades;
    if (b >= 3) fullyCovered.push(qid);
    else if (b >= 1) halfCovered.push(qid);
    else notCovered.push(qid);
  }

  return {
    sessionId: oldLedger.sessionId,
    mode: oldLedger.mode,
    totalTurns: newTotalTurns,
    entries: newEntries,
    fullyCovered,
    halfCovered,
    notCovered,
    updatedAt: Date.now(),
  };
}

// =========================================================================
// 4. computeNewlyFullyCovered —— 新晋"聊透"题号
// =========================================================================

/**
 * 返回 newLedger 比 oldLedger 新增进入 fullyCovered 的题号数组。
 * 用于 chat/stream 中对每个新晋题号 incr 全站 stats counter（避免重复计数）。
 */
export function computeNewlyFullyCovered(
  oldLedger: QLedger | null,
  newLedger: QLedger
): number[] {
  const oldSet = new Set(oldLedger?.fullyCovered ?? []);
  return newLedger.fullyCovered.filter((q) => !oldSet.has(q));
}

// =========================================================================
// 5. loadLedger / saveLedger —— KV 读写
// =========================================================================

import { getClient } from "@/lib/stats/kv";

/**
 * 读账本。
 * - 不存在 / 解析失败 → 返回 null（由调用方决定降级为 makeEmptyLedger）
 * - KV 层异常 → 上抛（不在本函数吞）
 */
export async function loadLedger(sessionId: string): Promise<QLedger | null> {
  const kv = await getClient();
  const raw = await kv.get<string>(K_SESSION_LEDGER(sessionId));
  if (!raw) return null;
  try {
    if (typeof raw === "string") {
      return JSON.parse(raw) as QLedger;
    }
    // Upstash 有时直接还原为 object
    return raw as unknown as QLedger;
  } catch {
    return null;
  }
}

/**
 * 写账本。每次都重设 90 天 TTL（活跃会话不过期）。
 */
export async function saveLedger(ledger: QLedger): Promise<void> {
  const kv = await getClient();
  await kv.set(K_SESSION_LEDGER(ledger.sessionId), JSON.stringify(ledger), {
    ex: SESSION_LEDGER_TTL_SECONDS,
  });
}
