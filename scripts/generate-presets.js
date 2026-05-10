#!/usr/bin/env node
/**
 * ============================================================
 * 预制回复生成脚本 (v0.4.2)
 * ============================================================
 *
 * 目的：
 *   为 EmptyState 里 9 个引导 tips（三档 × 3 个）预生成：
 *     - AI 回复文本（调真实 deepseek 拿到的姐姐真实开场金句）
 *     - 对应音色的 mp3（火山 TTS 提前合成好）
 *
 * 产物：
 *   - public/preset-voices/{mode}-{idx}.mp3    (9 个文件)
 *   - lib/presetReplies.ts                     (文本 + 元数据)
 *
 * 用法：
 *   node scripts/generate-presets.js              # 跑全部
 *   node scripts/generate-presets.js casual       # 仅跑 casual
 *   node scripts/generate-presets.js --dry-run    # 只出文本，不生成 mp3
 *
 * 依赖：纯 Node 20+ 原生 fetch，无需 ts-node/tsx
 * 环境变量从 .env.local 自动读取（DEEPSEEK_API_KEY / VOLC_API_KEY）
 * ============================================================
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_VOICES_DIR = path.join(ROOT, "public", "preset-voices");
const OUTPUT_TS = path.join(ROOT, "lib", "presetReplies.ts");

// ---- 1. 加载 .env.local ----
function loadEnv() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("❌ .env.local 不存在");
    process.exit(1);
  }
  const text = fs.readFileSync(envPath, "utf-8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    )
      val = val.slice(1, -1);
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnv();

// ---- 2. 配置 ----

/** 与 Chat.tsx EmptyState 里 tips[mode] 对齐的 9 个引导句 */
const TIPS = {
  casual: [
    "今天突然想做个陪伴类 AI",
    "我又想做自媒体了",
    "我打算开个小红书账号记录日常",
  ],
  rational: [
    "我做了个 PRD，用户画像是月薪 1-2 万打工人",
    "我调研了 30 个朋友都说愿意付费",
    "MVP 预算 50 万，3 个月上线，拆给我看",
  ],
  scathing: [
    "我要做下一个 DeepSeek",
    "我要 all in 辞职去做 AI 创业",
    "我这个 idea 绝对能干掉抖音",
  ],
};

/** 与 lib/volcano-tts.ts 保持一致的三档音色配置 */
const VOICE_CONFIG = {
  casual: {
    speaker: "zh_female_qingchezizi_uranus_bigtts",
    resourceId: "seed-tts-2.0",
    emotion: "neutral",
    speech_rate: 30,
    displayName: "清澈梓梓（北京大妞）",
  },
  rational: {
    speaker: "zh_female_lingling_uranus_bigtts",
    resourceId: "seed-tts-2.0",
    emotion: "calm",
    speech_rate: 30,
    displayName: "玲玲（清冷阿梦）",
  },
  scathing: {
    speaker: "ICL_zh_female_aojiaonvyou_tob",
    resourceId: "seed-tts-1.0",
    emotion: "coldness",
    speech_rate: 25,
    displayName: "傲娇女友（高冷御姐）",
  },
};

const MODE_TEMPERATURE = {
  casual: 0.8,
  rational: 0.5,
  scathing: 0.9,
};

/**
 * 追加到 system prompt 末尾的"预制首轮"强约束（v0.4.2）。
 * 严格对齐【首轮黄金公式】4 段式：嫌弃钩子/冷启 → 扎人事实(必须引锚点) → 戳小尴尬/单追 → 甩追问/沉默收
 * 3 档字数：casual/rational 180-260，scathing 200-280
 */
function buildPresetInstruction(mode) {
  const targetLen =
    mode === "scathing" ? "200-280" : "180-260";
  const modeNote =
    mode === "casual"
      ? "嫌弃小妹腔：翻白眼 + 戳生活小尴尬 + 最后甩一个小追问"
      : mode === "rational"
      ? "审讯御姐腔：短句+沉默 + 单点深追 + 沉默式收尾（如『继续。』）"
      : "毒舌御姐腔：笑着开刀 + 揭动机/逃避 + 甩挑衅";

  return `

---

## ⚡ 当前是【预制首轮模式】（v0.4.2 · 仅此一次生效）

你现在要输出的是**用户刚落座第一次发话，你开场的完整回应**——不是短金句，是完整首轮。

严格按【首轮黄金公式】4 段式输出，保持 ${modeNote}。

### 硬性约束（违反任何一条都算失败）

1. **总字数 ${targetLen} 字**——不可低于下限，不可高于上限
2. **4 段结构，每段空行分隔**——少 1 段也算失败
3. **段② 必须引用一条具体锚点**（产品名 / 数字 / 真实对标 / 具体行为）——不能是抽象劝阻
   - ✅ "Character.AI 月活两千万"
   - ✅ "BAT 里这种大话做出 Demo 不到 1%"
   - ✅ "几十亿美金起步、顶尖数学家堆出来的巨兽"
   - ❌ "市场竞争激烈"（抽象）
   - ❌ "需要差异化"（空话）
4. **不用 markdown 列表（1. 2. 3.）、不用"首先/其次"、不用小标题**
5. **不加 emoji**
6. **不说"希望对你有帮助""加油""祝你好运"**
7. **开头不用"哎呀""那""关于这个"**——直接用你人设招牌开场

### 输出纯文本，不要任何 meta（像"以下是回复："这类）

只输出姐姐的 4 段回复本身，段间空行。`;
}

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const VOLC_URL = "https://openspeech.bytedance.com/api/v3/tts/unidirectional";

// ---- 3. 读 system prompt ----
function loadPrompt(mode) {
  const p = path.join(ROOT, "lib", "prompts", `${mode}.md`);
  return fs.readFileSync(p, "utf-8");
}

// ---- 4. 调 deepseek（非流式） ----
async function deepseekReply(systemPrompt, userMessage, temperature, mode) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY 未设置");

  const instruction = buildPresetInstruction(mode);

  const res = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt + instruction },
        { role: "user", content: userMessage },
      ],
      temperature,
      max_tokens: 700, // 180-280 字 ≈ 500-600 token，留余量
      stream: false,
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`deepseek ${res.status}: ${t}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || "";
  return content.trim();
}

// ---- 4.5. 3 版打分选 1（B 方案核心） ----

/**
 * 已知的干货锚点关键词库（从 toxic-pm 9 条真实回复里扒出来的 + 我们 Patch C 里写的）
 * 段② 命中任意一条 = 有料
 */
const ANCHOR_KEYWORDS = [
  // 陪伴 AI / 情感 App
  "Character.AI", "Character AI", "Replika", "Glow", "筑梦岛", "猫箱",
  "月活", "融资", "几千万美金", "几亿美金",
  // 自媒体 / 账号
  "泛情感", "生活记录", "个人成长", "顶级", "垂直", "人设",
  "几百万", "几千万", "小红书", "抖音", "B站", "公众号",
  "爆文率", "停更",
  // 调研 / 需求
  "礼貌性捧杀", "真金白银", "名单", "真目标用户",
  // 预算 / 术语
  "三流 App", "三流App", "外包", "赋能", "闭环", "中台", "颠覆世界",
  // AI 创业 / 辞职
  "卖煎饼", "套壳", "作为一个大语言模型", "裸辞", "失业",
  // 大厂 / 颠覆
  "BAT", "Demo", "1%", "算法", "祖宗十八代", "长生不老", "发钱",
  // 自研 / DeepSeek
  "H800", "英伟达", "梁文锋", "几十亿美金", "数学家", "百万年薪",
  // 微信小程序 / 工具
  "700 万", "月活 <100", "飞书", "钉钉", "腾讯文档", "Notion",
  // 知识付费 / 社群
  "月入过万", "4000 万", "沉默率", "90%",
  // 通用数字体感
  "不到 1%", "不到1%", "% 停更",
];

/**
 * 给一条回复打分（0-100）。4 个维度加权。
 * 分数越高越"符合首轮黄金公式 + 锚点命中"。
 */
function scoreReply(reply, mode) {
  if (!reply) return { score: 0, reasons: ["空回复"] };

  const reasons = [];
  let score = 0;
  const len = [...reply].length; // 中文字符数
  const paragraphs = reply.split(/\n\s*\n/).filter((s) => s.trim().length > 0);

  // ① 字数（30 分）—— 在目标区间内满分
  const targetMin = mode === "scathing" ? 200 : 180;
  const targetMax = mode === "scathing" ? 280 : 260;
  if (len >= targetMin && len <= targetMax) {
    score += 30;
    reasons.push(`✅字数${len}在[${targetMin}-${targetMax}]`);
  } else if (len >= targetMin - 30 && len <= targetMax + 60) {
    // 稍微超纲也给部分分
    score += 15;
    reasons.push(`⚠️字数${len}略超[${targetMin}-${targetMax}]`);
  } else {
    reasons.push(`❌字数${len}严重偏离[${targetMin}-${targetMax}]`);
  }

  // ② 4 段结构（25 分）—— 3 段以上给分，正好 4 段满分
  if (paragraphs.length === 4) {
    score += 25;
    reasons.push(`✅4段结构`);
  } else if (paragraphs.length === 3) {
    score += 15;
    reasons.push(`⚠️3段（少1段）`);
  } else if (paragraphs.length === 5) {
    score += 15;
    reasons.push(`⚠️5段（多1段）`);
  } else if (paragraphs.length >= 2) {
    score += 5;
    reasons.push(`❌段数${paragraphs.length}不符`);
  } else {
    reasons.push(`❌只有${paragraphs.length}段`);
  }

  // ③ 锚点命中（30 分）—— 段② 必须有具体对标/数字/真名
  const hits = ANCHOR_KEYWORDS.filter((kw) => reply.includes(kw));
  if (hits.length >= 2) {
    score += 30;
    reasons.push(`✅锚点命中${hits.length}个：${hits.slice(0, 3).join("/")}`);
  } else if (hits.length === 1) {
    score += 20;
    reasons.push(`⚠️锚点仅命中1个：${hits[0]}`);
  } else {
    // 兜底：有数字（\d+[%万亿]）也算半分
    const hasNumber = /\d+\s*(%|万|亿|千|百)/.test(reply) || /\$\d+/.test(reply);
    if (hasNumber) {
      score += 10;
      reasons.push(`⚠️无明确锚点但有数字`);
    } else {
      reasons.push(`❌段②空转，无锚点无数字`);
    }
  }

  // ④ 开头狠度（15 分）—— 禁用"哎呀/那/关于/你好"，鼓励带语气词或人设招牌
  const firstLine = (paragraphs[0] || reply).slice(0, 20);
  const badOpeners = ["哎呀", "关于", "你好", "那么", "首先"];
  const goodOpeners =
    mode === "casual"
      ? ["啊？", "嗯？", "哎？", "哎哟", "诶", "不是吧", "停", "哦？"]
      : mode === "rational"
      ? ["停", "等等", "先", "'", "\"", "别急", "放下"]
      : ["噗", "哈", "哟", "哇塞", "哟呵", "行", "啧"];
  if (badOpeners.some((b) => firstLine.startsWith(b))) {
    reasons.push(`❌开头俗套：${firstLine.slice(0, 6)}`);
  } else if (goodOpeners.some((g) => firstLine.includes(g))) {
    score += 15;
    reasons.push(`✅开头带人设招牌`);
  } else {
    score += 8;
    reasons.push(`⚠️开头普通`);
  }

  // 扣分项
  if (/希望对|祝你|加油|hope/i.test(reply)) {
    score -= 20;
    reasons.push(`❌有鸡汤尾`);
  }
  if (/^\s*\d+[\.、)]/m.test(reply)) {
    score -= 15;
    reasons.push(`❌用了数字列表`);
  }

  return { score, reasons, len, paragraphs: paragraphs.length, hits };
}

/**
 * 跑 N 次 deepseek，按 scoreReply 排序取 Top 1，其它版本放 alternatives。
 */
async function deepseekBestOfN(systemPrompt, userMessage, mode, n = 3) {
  const baseTemp = MODE_TEMPERATURE[mode];
  const variants = [];

  for (let attempt = 0; attempt < n; attempt++) {
    // 温度略微扰动，避免 3 版全一样
    const t = Math.max(0.3, Math.min(1.1, baseTemp + (attempt - 1) * 0.1));
    try {
      const reply = await deepseekReply(systemPrompt, userMessage, t, mode);
      const evaluation = scoreReply(reply, mode);
      variants.push({ attempt: attempt + 1, temperature: t, reply, ...evaluation });
      console.log(
        `        v${attempt + 1}(T=${t.toFixed(2)}): 分=${evaluation.score} 字=${evaluation.len} 段=${evaluation.paragraphs} 锚=${evaluation.hits.length}`
      );
    } catch (e) {
      console.error(`        v${attempt + 1} 失败：${e.message}`);
    }
  }

  if (variants.length === 0) throw new Error(`3 版全部失败`);

  variants.sort((a, b) => b.score - a.score);
  const best = variants[0];
  const alternatives = variants.slice(1);

  console.log(
    `        🏆 选中 v${best.attempt}（分=${best.score}）理由：${best.reasons.join(" | ")}`
  );

  return { best, alternatives };
}

// ---- 5. 调火山 TTS（NDJSON 流解析） ----
async function volcanoSynth(text, mode) {
  const apiKey = process.env.VOLC_API_KEY;
  if (!apiKey) throw new Error("VOLC_API_KEY 未设置");
  const cfg = VOICE_CONFIG[mode];

  const res = await fetch(VOLC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
      "X-Api-Resource-Id": cfg.resourceId,
    },
    body: JSON.stringify({
      user: { uid: "xingxing-ink-preset" },
      req_params: {
        text,
        speaker: cfg.speaker,
        audio_params: {
          format: "mp3",
          sample_rate: 24000,
          emotion: cfg.emotion,
          speech_rate: cfg.speech_rate,
        },
      },
    }),
  });

  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => "");
    throw new Error(`volcano ${res.status}: ${t}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  const chunks = [];
  let buf = "";
  let lastErr = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      try {
        const obj = JSON.parse(line);
        if (obj.code === 0 && typeof obj.data === "string" && obj.data) {
          chunks.push(Buffer.from(obj.data, "base64"));
        } else if (obj.code === 20000000) {
          // done
        } else if (typeof obj.code === "number" && obj.code !== 0) {
          lastErr = obj;
        }
      } catch {
        /* skip */
      }
    }
  }
  // tail
  const tail = buf.trim();
  if (tail) {
    try {
      const obj = JSON.parse(tail);
      if (obj.code === 0 && typeof obj.data === "string" && obj.data) {
        chunks.push(Buffer.from(obj.data, "base64"));
      }
    } catch {}
  }
  if (chunks.length === 0) {
    throw new Error(
      `volcano 无音频返回${lastErr ? `：code=${lastErr.code} msg=${lastErr.message}` : ""}`
    );
  }
  return Buffer.concat(chunks);
}

// ---- 6. 主流程 ----
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const onlyMode = args.find((a) => ["casual", "rational", "scathing"].includes(a));

  if (!fs.existsSync(PUBLIC_VOICES_DIR))
    fs.mkdirSync(PUBLIC_VOICES_DIR, { recursive: true });

  const output = []; // { mode, index, trigger, reply, audio }
  const modes = onlyMode ? [onlyMode] : ["casual", "rational", "scathing"];

  for (const mode of modes) {
    console.log(`\n════════════════════════════════`);
    console.log(`🎭 档位：${mode} (${VOICE_CONFIG[mode].displayName})`);
    console.log(`════════════════════════════════`);
    const sys = loadPrompt(mode);
    const tips = TIPS[mode];

    for (let i = 0; i < tips.length; i++) {
      const trigger = tips[i];
      console.log(`\n  [${i + 1}/3] 用户：${trigger}`);
      console.log(`      调 deepseek（3 版采样 + 打分选 1）...`);
      let best, alternatives;
      try {
        const result = await deepseekBestOfN(sys, trigger, mode, 3);
        best = result.best;
        alternatives = result.alternatives;
      } catch (e) {
        console.error(`      ❌ deepseek 全失败：${e.message}`);
        continue;
      }
      const reply = best.reply;
      console.log(`      ✨ 入选回复（${best.len}字 / ${best.paragraphs}段）：\n${reply.split("\n").map((l) => "        │ " + l).join("\n")}`);

      const audioRel = `/preset-voices/${mode}-${i}.mp3`;
      const audioAbs = path.join(PUBLIC_VOICES_DIR, `${mode}-${i}.mp3`);

      if (dryRun) {
        console.log(`      💨 --dry-run 跳过 TTS`);
      } else {
        try {
          console.log(`      🎤 调火山 TTS...`);
          const mp3 = await volcanoSynth(reply, mode);
          fs.writeFileSync(audioAbs, mp3);
          console.log(`      💾 保存 ${audioRel}（${mp3.length} bytes）`);
        } catch (e) {
          console.error(`      ❌ TTS 失败：${e.message}`);
          continue;
        }
      }

      output.push({
        mode,
        index: i,
        trigger,
        reply,
        audio: audioRel,
        score: best.score,
        len: best.len,
        paragraphs: best.paragraphs,
        hits: best.hits,
        reasons: best.reasons,
        alternatives: alternatives.map((a) => ({
          reply: a.reply,
          score: a.score,
          len: a.len,
          paragraphs: a.paragraphs,
          hits: a.hits,
        })),
      });
    }
  }

  // 生成 lib/presetReplies.ts（主产物：入选的 9 条）
  const mainPresets = {
    casual: output
      .filter((o) => o.mode === "casual")
      .map((o) => ({ trigger: o.trigger, reply: o.reply, audio: o.audio })),
    rational: output
      .filter((o) => o.mode === "rational")
      .map((o) => ({ trigger: o.trigger, reply: o.reply, audio: o.audio })),
    scathing: output
      .filter((o) => o.mode === "scathing")
      .map((o) => ({ trigger: o.trigger, reply: o.reply, audio: o.audio })),
  };
  const tsContent = `/**
 * 自动生成 —— 勿手动编辑。
 * 生成脚本：scripts/generate-presets.js
 * 重新生成：node scripts/generate-presets.js
 *
 * 包含 EmptyState 9 个引导 tip 对应的预制 AI 回复 + 音频路径。
 * 用户点 tip 时，首轮直接展示预制内容（0 延迟、0 API 开销），
 * 第二轮起走真实 deepseek。
 *
 * 本次生成采用 B 方案：每条 3 版采样 + 打分选 1。
 * 备选版本见同级的 presetReplies.alternatives.json（用于人工回退/审阅）
 */

import type { ModeId } from "./prompts";

export interface PresetReply {
  /** 用户点击的 tip 原文（匹配 key） */
  trigger: string;
  /** AI 姐姐的预制回复（真实 deepseek 生成 + 自动评分选 1） */
  reply: string;
  /** 预制音频相对路径（/preset-voices/{mode}-{idx}.mp3） */
  audio: string;
}

export const PRESET_REPLIES: Record<ModeId, PresetReply[]> = ${JSON.stringify(
    mainPresets,
    null,
    2
  )};

/** 根据 mode + trigger 文本快速查找预制回复（O(n) n=3 可接受） */
export function findPreset(
  mode: ModeId,
  trigger: string
): PresetReply | null {
  const list = PRESET_REPLIES[mode];
  if (!list) return null;
  return list.find((p) => p.trigger === trigger) || null;
}
`;
  fs.writeFileSync(OUTPUT_TS, tsContent);

  // 同时生成 alternatives 审阅文件（开发期查看/回退用）
  const ALT_JSON = path.join(ROOT, "lib", "presetReplies.alternatives.json");
  const altData = output.map((o) => ({
    mode: o.mode,
    index: o.index,
    trigger: o.trigger,
    winner: {
      reply: o.reply,
      score: o.score,
      len: o.len,
      paragraphs: o.paragraphs,
      hits: o.hits,
      reasons: o.reasons,
    },
    alternatives: o.alternatives,
  }));
  fs.writeFileSync(ALT_JSON, JSON.stringify(altData, null, 2));
  console.log(`\n═════════════════════════════════════`);
  console.log(`✅ 全部完成，共生成 ${output.length} 条预制（B 方案 3 选 1）`);
  console.log(`📄 主产物：${OUTPUT_TS}`);
  console.log(`🔍 备选审阅：${ALT_JSON}`);
  console.log(`🎵 音频目录：${PUBLIC_VOICES_DIR}`);
  const avgScore =
    output.reduce((s, o) => s + (o.score || 0), 0) / (output.length || 1);
  console.log(`📊 平均分：${avgScore.toFixed(1)}/100`);
  console.log(`═════════════════════════════════════`);
}

main().catch((e) => {
  console.error("\n💥 脚本崩溃：", e);
  process.exit(1);
});
