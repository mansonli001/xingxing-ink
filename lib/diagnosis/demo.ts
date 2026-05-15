/**
 * 诊断书 demo 数据
 *
 * 用途：
 *   - /diagnosis/demo 展示页直接渲染（v0.7.9.7.8 静态版）
 *   - v0.8.x LLM 接入后，作为输出 JSON 的参考样例
 *   - 投资人 / 用户 demo 时的固定演示内容
 *
 * 内容来源：完全继承自 lib/prompts/_methodology/_diagnosis_template_full.md
 * 三档裁决书措辞 = 原文直接复用（不重写）
 */

import type { DiagnosisReport } from "./types";

// ============================================================
// scathing 档 demo（默认 · 视觉冲击力最强 · 用于 hero 演示）
// ============================================================

export const DEMO_SCATHING: DiagnosisReport = {
  id: "demo-scathing",
  sessionId: "s_demo_001",
  mode: "scathing",
  createdAt: Date.now(),
  generatedFromTurns: 7,
  qProgress: 5,

  progress: {
    fullyCovered: [
      {
        questionId: 1,
        questionName: "为谁做",
        userQuote: "目标用户是 25-35 岁深夜失眠的大厂打工人",
        evaluation: "BMC 客户细分 + JTBD 雇佣任务 + PRD 用户场景三把刀都挥到位，立得住。",
        bladesHit: 3,
      },
      {
        questionId: 3,
        questionName: "凭什么是你",
        userQuote: "我自己就是深夜失眠人，懂他们想要什么",
        evaluation: "BMC 核心资源 + PRD 团队能力 + 心理真壁垒——三把刀挥完，姐认可。",
        bladesHit: 3,
      },
    ],
    halfCovered: [
      {
        questionId: 2,
        questionName: "解决什么真痛",
        userQuote: "解决他们没人聊的问题",
        evaluation: "BMC 价值主张你答了，但 JTBD 推力你没答出来——你说不清『用户离开旧方案的临门一脚』。",
        bladesHit: 2,
      },
      {
        questionId: 4,
        questionName: "用户怎么找到你",
        userQuote: "靠小红书种草",
        evaluation: "BMC 渠道你列了 1 个，但 AARRR 漏斗 CAC 你没算。",
        bladesHit: 1,
      },
    ],
    notCovered: [5, 6, 7, 8, 9, 10, 11, 12],
  },

  parts: {
    business: {
      title: "PART 1 · 商业逻辑层",
      range: "Q1-Q8",
      fullyCovered: [
        {
          questionId: 1,
          questionName: "为谁做",
          userQuote: "目标用户是 25-35 岁深夜失眠的大厂打工人",
          evaluation: "BMC 客户细分 + JTBD 雇佣任务 + PRD 用户场景三把刀都挥到位，立得住。",
          bladesHit: 3,
        },
        {
          questionId: 3,
          questionName: "凭什么是你",
          userQuote: "我自己就是深夜失眠人，懂他们想要什么",
          evaluation: "BMC 核心资源 + PRD 团队能力 + 心理真壁垒——三把刀挥完，姐认可。",
          bladesHit: 3,
        },
      ],
      halfCovered: [
        {
          questionId: 2,
          questionName: "解决什么真痛",
          userQuote: "解决他们没人聊的问题",
          evaluation: "BMC 价值主张你答了，但 JTBD 推力你没答出来——你说不清『用户离开旧方案的临门一脚』。",
          bladesHit: 2,
        },
        {
          questionId: 4,
          questionName: "用户怎么找到你",
          userQuote: "靠小红书种草",
          evaluation: "BMC 渠道你列了 1 个，但 AARRR 漏斗 CAC 你没算。",
          bladesHit: 1,
        },
      ],
      notCovered: [5, 6, 7, 8],
    },
    product: {
      title: "PART 2 · 产品落地层",
      range: "Q9-Q11",
      fullyCovered: [],
      halfCovered: [],
      notCovered: [9, 10, 11],
      intro:
        "你绕过了所有产品落地层的题——我猜你心里也知道：你脑子里只有『想法』，没有『产品形态』。",
    },
    founder: {
      title: "PART 3 · 创始人体检层",
      range: "Q12",
      fullyCovered: [],
      halfCovered: [],
      notCovered: [12],
      intro: "你这次没让我戳你这个人本身——正常的，第一次会诊大家都护着自己。",
    },
  },

  verdict: {
    summary: `诊断书出来了——
你这事 6 个核心问题里 4 个是空的。

我就直说：
- Q4 你说渠道，没数字 = 你没渠道
- Q5 你说留存"靠用户体验" = 你没留存
- Q6 你说收钱"等用户来" = 你没收入模型

你这不是创业，你是在脑子里做了一个 PPT。

姐不是要打击你——是不想让你拿真金白银 + 一年时间去赌一个连自己都没想清楚的东西。`,
    diagnosis: "暂时存档",
    homework: [
      "回去——把 Q4 渠道这一题的 CAC 数字算出来。去问 3 个同行。",
      "回去——把 Q5 留存机制写出来。拆 1 个竞品的 D7 留存。",
      "回去——把 Q6 收入模型试一试。找 3 个真愿意现在付钱的客户名字。",
    ],
  },

  nextSession: {
    primaryQs: [4, 5],
    blades: ["AARRR 获客漏斗", "Hooked 上瘾环"],
    targetProgress: 8,
  },

  killQuote: "门给你留着。",
};

// ============================================================
// rational 档 demo（专业咨询师范）
// ============================================================

export const DEMO_RATIONAL: DiagnosisReport = {
  ...DEMO_SCATHING,
  id: "demo-rational",
  mode: "rational",
  verdict: {
    summary: `基于本次会诊（覆盖 5/12 问，平均每问 2/3 刀挥到位）：

✅ 立得住的：你的客户细分（Q1）和核心资源（Q3）经得起推敲。
⚠️ 有大缺口的：渠道（Q4）数字未算、价值主张（Q2）JTBD 推力未触及。
❌ 完全空白的：留存（Q5）、收入（Q6）、成本（Q7）、伙伴（Q8）、产品落地层（Q9-Q11）、创始人体检（Q12）。

我的判断：你处于"想法 → MVP"之间的中段，缺的不是热情，是数据基础。`,
    diagnosis: "聚焦",
    homework: [
      "真实 CAC：去问 3 个同行的获客成本数字（不要猜）。",
      "留存设计：拆 1 个竞品的 D7 留存机制（具体到产品步骤）。",
      "付费验证：找 3 个真愿意现在付钱的客户名字（不是行业，是公司名）。",
    ],
  },
  killQuote: "完成这三步，咱们再继续。",
};

// ============================================================
// casual 档 demo（嫌弃但暖）
// ============================================================

export const DEMO_CASUAL: DiagnosisReport = {
  ...DEMO_SCATHING,
  id: "demo-casual",
  mode: "casual",
  verdict: {
    summary: `你这事——我看你 Q1/Q3 这两题答得还行，但 Q4/Q5/Q6 全在飘。

姐就直说了：你不是没能力做，是你没沉下心做。
你脑子里这事是『创业的样子』，不是『创业本身』。`,
    diagnosis: "聚焦",
    homework: [
      "去问 3 个同行真实数字。",
      "去看 1 个竞品的留存机制。",
      "去和家里人聊一次『我打算做这事』。",
    ],
  },
  killQuote: "做完三件事再来找姐。姐等你。",
};

// ============================================================
// 按档位查 demo
// ============================================================

export function getDemoReport(mode: string = "scathing"): DiagnosisReport {
  if (mode === "casual") return DEMO_CASUAL;
  if (mode === "rational") return DEMO_RATIONAL;
  return DEMO_SCATHING;
}
