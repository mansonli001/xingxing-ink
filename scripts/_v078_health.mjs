#!/usr/bin/env node
// v0.7.8 健康检查 v2（按需注入版）
// 用法：node scripts/_v078_health.mjs

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "lib", "prompts");

const SEP = "\n\n---\n\n";
const F = (rel) =>
  existsSync(join(root, rel)) ? readFileSync(join(root, rel), "utf-8") : "";

// 模拟 buildSystemPrompt 的实际拼接逻辑（按需注入版）
function build(turn, hasTrigger, mode = "scathing") {
  const parts = [];
  // core (5 文件)
  const core = [
    "core/00_output_rules.md",
    "core/01_product_anchor.md",
    "core/02_no_hallucination.md",
    "core/03_idea_first.md",
    "core/04_forced_choice.md",
  ]
    .map(F)
    .filter(Boolean)
    .join(SEP);
  parts.push(core);
  // persona
  parts.push(F(`persona/${mode}_core.md`));
  // dynamic
  if (turn <= 2) parts.push(F("dynamic/turn_1_2.md"));
  else if (turn <= 5) parts.push(F("dynamic/turn_3_5.md"));
  else parts.push(F("dynamic/turn_6_plus.md"));
  // response_structure 永远注入
  parts.push(F("dynamic/_response_structure.md"));
  // arsenal （命中场景才注入，先按 0 计算估个最大）
  // 这里假设没命中以测最低值；命中场景叠 1 段 _arsenal.md 大约 +800 chars
  // matrix + arsenal_addon: 仅 3+ 轮
  if (turn >= 3) {
    parts.push(F("_methodology/_matrix_v1.md"));
    parts.push(F(`arsenal_addon/${mode}.md`));
  }
  // response_protocol: 仅 trigger 命中
  if (hasTrigger) {
    parts.push(F("_methodology/_response_protocol.md"));
  }
  // diagnosis: 5+ 轮
  if (turn >= 5) {
    parts.push(F("_methodology/_diagnosis_template.md"));
  }
  // final reminder（estimate from index.ts inline ~1500 chars）
  parts.push("[final_reminder ~1500 chars 不在文件里，估算长度]");

  return parts.filter(Boolean).join(SEP);
}

console.log("=== v0.7.8 按需注入版 system prompt 长度估算 ===\n");
console.log("场景\t\t\t\tchars\ttokens(估)\tv0.7.7对比");
console.log("─".repeat(75));

const scenarios = [
  ["第 1 轮 · 正常对答", 1, false],
  ["第 1 轮 · 用户'不知道'", 1, true],
  ["第 2 轮 · 正常对答", 2, false],
  ["第 3 轮 · 正常对答", 3, false],
  ["第 3 轮 · 用户'大概'", 3, true],
  ["第 5 轮 · 正常对答", 5, false],
  ["第 5 轮 · 用户'不知道'", 5, true],
  ["第 6+ 轮 · 正常对答", 6, false],
  ["第 6+ 轮 · 全触发", 6, true],
];

const baseline077 = 12000; // v0.7.7 估算

for (const [name, turn, trigger] of scenarios) {
  const sp = build(turn, trigger);
  const chars = sp.length + 1500; // 加 final reminder
  const tokens = Math.round((chars * 0.6) / 1000);
  const ratio = ((chars / baseline077) * 100).toFixed(0);
  console.log(
    `${name.padEnd(28)}\t${chars.toString().padStart(6)}\t~${tokens}K\t\t${ratio}%`
  );
}

console.log("\n=== 三档主攻区弹药对比 ===");
for (const m of ["casual", "rational", "scathing"]) {
  const sp = build(5, false, m);
  console.log(`${m.padEnd(10)} 第 5 轮 · 正常: ${sp.length + 1500} chars`);
}

console.log("\n=== Trigger 词覆盖测试 ===");
const triggers = ["不知道", "没想过", "大概", "差不多", "我猜"];
console.log(`已配置 ${triggers.length}+ 个 trigger 词。命中即注入 5K chars 的 SOP。`);
