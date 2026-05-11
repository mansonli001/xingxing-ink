/**
 * v0.7.9 Q Picker · 12 问动态选择器
 *
 * 输入：用户当前消息 + 历史对话 + 轮次 + 档位
 * 输出：当前要攻的 primary Q + 已挥刀 index + 候选 Q list
 *
 * 算法：关键词命中 → 上一轮粘性 → 轮次递推 → 兜底起手
 *
 * 粘性铁律：一旦开始攻某个 Q，强制连续 3 轮注入对应 Q 弹药
 *           （除非用户明确跳题——出现强烈新 Q 关键词信号）
 */

import type { ModeId } from "./index";

// ============================================================
// Q 关键词词典（从 questions/Qn.md 末尾抽取）
// ============================================================

const Q_KEYWORDS: Record<string, string[]> = {
  Q1: ["目标用户", "画像", "给谁做", "受众", "客户细分", "白领", "学生", "宝妈", "年龄段", "用户群"],
  Q2: ["痛点", "价值主张", "差异化", "解决问题", "真痛", "为什么用你", "用户需求"],
  Q3: ["凭什么", "优势", "壁垒", "团队", "技术", "护城河", "我的能力", "我的经验", "为什么是我"],
  Q4: ["渠道", "CAC", "获客", "找到用户", "冷启动", "投流", "拉新", "营销", "公众号", "小红书", "抖音"],
  Q5: ["留存", "D7", "D30", "D1", "复购", "Retention", "二次打开", "粘性", "为什么留下", "Churn"],
  Q6: ["收钱", "付费", "定价", "订阅", "月费", "盈利", "收入", "商业模式", "赚钱", "变现", "广告"],
  Q7: ["成本", "烧钱", "LTV", "利润", "算力", "服务器", "团队工资", "亏损", "单位经济", "毛利"],
  Q8: ["合作", "伙伴", "外部 API", "依赖", "OpenAI", "平台风险", "政策风险", "保底", "兜底"],
  Q9: ["MVP", "最小可行", "砍功能", "核心功能", "上线", "产品形态", "Aha", "原型", "POC"],
  Q10: ["用户旅程", "路径", "流程", "操作", "使用", "Activation", "激活", "上手", "用户体验"],
  Q11: ["数据飞轮", "网络效应", "Investment", "规模效应", "复利", "增长曲线", "K 因子", "数据壁垒"],
  Q12: ["创业动机", "止损", "家人", "孩子", "老婆", "老公", "年薪", "机会成本", "年龄", "坚持", "放弃", "赌", "被裁", "FOMO"],
};

// ============================================================
// 档位起手 Q（用户给的 idea 类型 → 推荐起手）
// ============================================================

const FALLBACK_START_BY_MODE: Record<ModeId, string> = {
  casual: "Q1", // casual 戳人性脆弱，从"为谁做"切入最自然
  rational: "Q2", // rational 数字逻辑，从"真痛"切入要数据
  scathing: "Q4", // scathing 见血封喉，从"用户怎么找到你"切入最毒
};

// ============================================================
// PickResult 数据结构
// ============================================================

export interface QPickResult {
  /** 当前主攻 Q（注入 questions/Qn.md + arsenal_addon/{mode}_q/Qn.md） */
  primaryQ: string;
  /** 当前是这一题的第几把刀（1/2/3） */
  bladeIndex: number;
  /** 是否粘性中（true = 同一题继续攻；false = 跳题或首攻） */
  isSticky: boolean;
  /** 候选 Q（备用注入候选 · 暂不用，留给将来） */
  candidateQs: string[];
  /** Debug 信息（dev 用） */
  debug?: {
    detectedKws: string[];
    decision: string;
  };
}

// ============================================================
// 主接口：pickCurrentQ
// ============================================================

/**
 * 从用户消息 + 历史 + 轮次决定当前 Q + bladeIndex
 *
 * @param userMessage 当前用户消息
 * @param recentHistory 最近 4 轮对话 (user+assistant 交替)
 * @param userTurnCount 当前是用户第几轮发言（1 起）
 * @param mode 档位
 */
export function pickCurrentQ(
  userMessage: string,
  recentHistory: { role: "user" | "assistant"; content: string }[],
  userTurnCount: number,
  mode: ModeId
): QPickResult {
  // === 第 1-2 轮 → 不启用 picker（仍按 v0.7.7 原有逻辑） ===
  if (userTurnCount < 3) {
    return {
      primaryQ: FALLBACK_START_BY_MODE[mode],
      bladeIndex: 1,
      isSticky: false,
      candidateQs: [],
      debug: { detectedKws: [], decision: "early-turn-fallback" },
    };
  }

  // === Step 1: 检测当前用户消息和历史里的 Q 关键词 ===
  const detected = detectQs(userMessage, recentHistory);

  // === Step 2: 看上 1-3 轮 assistant 是否在攻某个 Q（粘性判断） ===
  const lastQ = inferLastAttackedQ(recentHistory);

  // === Step 3: 决策树 ===

  // 3.1 用户当前消息出现强烈新 Q 信号 → 跳题
  if (detected.length > 0 && lastQ.q && !detected.includes(lastQ.q)) {
    // 用户明确跳题——尊重用户
    return {
      primaryQ: detected[0],
      bladeIndex: 1,
      isSticky: false,
      candidateQs: detected.slice(1, 3),
      debug: {
        detectedKws: detected,
        decision: `user-jump from ${lastQ.q} to ${detected[0]}`,
      },
    };
  }

  // 3.2 上一轮在攻某 Q + 还没挥完 3 把刀 → 粘性继续
  if (lastQ.q && lastQ.bladeIndex < 3) {
    return {
      primaryQ: lastQ.q,
      bladeIndex: lastQ.bladeIndex + 1,
      isSticky: true,
      candidateQs: detected.length > 0 ? [detected[0]] : [],
      debug: {
        detectedKws: detected,
        decision: `sticky on ${lastQ.q}, blade ${lastQ.bladeIndex + 1}`,
      },
    };
  }

  // 3.3 上一题挥完 3 刀 → 切下一题（按用户当前关键词或推荐）
  if (lastQ.q && lastQ.bladeIndex >= 3) {
    const nextQ = detected.length > 0 ? detected[0] : pickNextQByMode(mode, lastQ.q);
    return {
      primaryQ: nextQ,
      bladeIndex: 1,
      isSticky: false,
      candidateQs: [],
      debug: {
        detectedKws: detected,
        decision: `${lastQ.q} done (3/3), next ${nextQ}`,
      },
    };
  }

  // 3.4 完全没识别上一题（首次进入 picker）→ 按用户消息或起手
  const startQ = detected.length > 0 ? detected[0] : FALLBACK_START_BY_MODE[mode];
  return {
    primaryQ: startQ,
    bladeIndex: 1,
    isSticky: false,
    candidateQs: detected.slice(1, 3),
    debug: {
      detectedKws: detected,
      decision: `first-pick ${startQ}`,
    },
  };
}

// ============================================================
// Helpers
// ============================================================

/** 检测文本中的 Q 关键词，按命中数排序返回 */
function detectQs(
  userMessage: string,
  history: { role: string; content: string }[]
): string[] {
  // 当前消息权重 3 倍，最近 1 轮历史权重 2 倍，再前的 1 倍
  const weighted: Record<string, number> = {};

  const addHits = (text: string, weight: number) => {
    for (const [Q, kws] of Object.entries(Q_KEYWORDS)) {
      for (const kw of kws) {
        if (text.includes(kw)) {
          weighted[Q] = (weighted[Q] || 0) + weight;
        }
      }
    }
  };

  addHits(userMessage, 3);
  if (history.length >= 1) addHits(history[history.length - 1]?.content || "", 2);
  if (history.length >= 2) addHits(history[history.length - 2]?.content || "", 1);

  return Object.entries(weighted)
    .sort((a, b) => b[1] - a[1])
    .filter(([, score]) => score > 0)
    .map(([Q]) => Q);
}

/** 从最近的 assistant 回复推断上一题攻的是哪个 Q + 第几刀 */
function inferLastAttackedQ(
  history: { role: string; content: string }[]
): { q: string | null; bladeIndex: number } {
  // 反向遍历找 assistant 消息，看 Q 关键词命中
  const recentAssistant = history.filter((m) => m.role === "assistant").slice(-3);

  if (recentAssistant.length === 0) {
    return { q: null, bladeIndex: 0 };
  }

  // 把最近 3 轮 assistant 的关键词命中聚合
  const qHits: Record<string, number> = {};
  for (const msg of recentAssistant) {
    for (const [Q, kws] of Object.entries(Q_KEYWORDS)) {
      for (const kw of kws) {
        if (msg.content.includes(kw)) {
          qHits[Q] = (qHits[Q] || 0) + 1;
        }
      }
    }
  }

  if (Object.keys(qHits).length === 0) {
    return { q: null, bladeIndex: 0 };
  }

  // 找命中最多的 Q
  const sorted = Object.entries(qHits).sort((a, b) => b[1] - a[1]);
  const topQ = sorted[0][0];

  // bladeIndex = 该 Q 在最近 assistant 里被攻的次数（最多 3）
  const bladeIndex = Math.min(qHits[topQ], 3);

  return { q: topQ, bladeIndex };
}

/** 当一题挥完 3 刀后选下一题（按档位主攻区） */
function pickNextQByMode(mode: ModeId, lastQ: string): string {
  const PRIMARY_BY_MODE: Record<ModeId, string[]> = {
    casual: ["Q1", "Q4", "Q5", "Q10", "Q12"],
    rational: ["Q2", "Q3", "Q6", "Q7", "Q9", "Q11"],
    scathing: ["Q4", "Q6", "Q8", "Q11", "Q12"],
  };

  const primary = PRIMARY_BY_MODE[mode];
  // 找 lastQ 在 primary 里的位置 → 下一个
  const idx = primary.indexOf(lastQ);
  if (idx >= 0 && idx + 1 < primary.length) {
    return primary[idx + 1];
  }

  // lastQ 不是主攻区 or 已经是最后一个 → 取第一个还没攻过的
  // 简化：直接取 primary[0]（粘性 picker 会在下次粘住此 Q）
  return primary[0];
}
