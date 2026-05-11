#!/usr/bin/env node
/**
 * v0.7.9 健康检查 · 验证 12 问动态 picker 注入效果
 *
 * 模拟不同轮次 + Q 选择，估算 system prompt 长度。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function readSize(rel) {
  try {
    return fs.readFileSync(path.join(ROOT, "lib/prompts", rel), "utf-8").length;
  } catch {
    return 0;
  }
}

console.log("=== v0.7.9 文件就位检查 ===\n");

// 永远注入
const core = readSize("core/_iron_rules.md") + readSize("core/_redlines.md") + readSize("core/_no_drift.md") + readSize("core/_one_at_a_time.md") + readSize("core/_no_stage_directions.md");
const personaCasual = readSize("persona/casual_core.md");
const personaRational = readSize("persona/rational_core.md");
const personaScathing = readSize("persona/scathing_core.md");
const dynamicTurn3 = readSize("dynamic/turn_3_5.md");
const dynamicTurn6 = readSize("dynamic/turn_6_plus.md");
const arsenal = readSize("_arsenal.md");
const responseStructure = readSize("dynamic/_response_structure.md");

// v0.7.9 新文件
const overview = readSize("_methodology/_matrix_overview.md");
const Q_SIZES = {};
for (let i = 1; i <= 12; i++) {
  Q_SIZES[`Q${i}`] = readSize(`_methodology/questions/Q${i}.md`);
}
const ADDON_Q_SIZES = {};
for (const mode of ["casual", "rational", "scathing"]) {
  ADDON_Q_SIZES[mode] = {};
  for (let i = 1; i <= 12; i++) {
    ADDON_Q_SIZES[mode][`Q${i}`] = readSize(`arsenal_addon/${mode}_q/Q${i}.md`);
  }
}

// 共用层
const responseProtocol = readSize("_methodology/_response_protocol.md");
const diagnosis = readSize("_methodology/_diagnosis_template.md");
// final_reminder ~2.5K（写在 index.ts 里硬编码估算）
const finalReminder = 2500;

console.log(`overview:               ${overview} chars`);
console.log(`Q1-Q12 平均:            ${Math.round(Object.values(Q_SIZES).reduce((a, b) => a + b, 0) / 12)} chars/Q`);
console.log(`addon_q (casual) 平均:  ${Math.round(Object.values(ADDON_Q_SIZES.casual).reduce((a, b) => a + b, 0) / 12)} chars/Q`);
console.log(`addon_q (scathing) 平均: ${Math.round(Object.values(ADDON_Q_SIZES.scathing).reduce((a, b) => a + b, 0) / 12)} chars/Q`);
console.log("");

// ==========================
// 计算典型场景的 prompt 长度
// ==========================

function estimate(persona, dynamicTurn, qFile, addonQ, includeProtocol, includeDiagnosis) {
  return (
    core +
    persona +
    dynamicTurn +
    arsenal +
    (qFile > 0 ? overview + qFile + addonQ : 0) +
    (includeProtocol ? responseProtocol : 0) +
    (includeDiagnosis ? diagnosis : 0) +
    responseStructure +
    finalReminder
  );
}

// 第 1-2 轮无方法论
const turn1Normal = core + personaScathing + readSize("dynamic/turn_1_2.md") + arsenal + responseStructure + finalReminder;

// 第 3 轮 · 攻 Q1
const turn3Q1 = estimate(personaScathing, dynamicTurn3, Q_SIZES.Q1, ADDON_Q_SIZES.scathing.Q1, false, false);
// 第 5 轮 · 攻 Q4 · 用户答模糊
const turn5Q4Trigger = estimate(personaScathing, dynamicTurn3, Q_SIZES.Q4, ADDON_Q_SIZES.scathing.Q4, true, true);
// 第 6+ 轮 · 攻 Q12 · 全触发
const turn6Q12Full = estimate(personaScathing, dynamicTurn6, Q_SIZES.Q12, ADDON_Q_SIZES.scathing.Q12, true, true);

console.log("=== v0.7.9 system prompt 长度估算 ===\n");
console.log(`场景\t\t\t\t  chars\t  tokens(估)`);
console.log(`────────────────────────────────────────────────`);
console.log(`第 1-2 轮 · 正常对答              ${turn1Normal}\t  ~${Math.round(turn1Normal / 1700)}K`);
console.log(`第 3 轮 · 攻 Q1                   ${turn3Q1}\t  ~${Math.round(turn3Q1 / 1700)}K`);
console.log(`第 5 轮 · 攻 Q4 · trigger+诊断    ${turn5Q4Trigger}\t  ~${Math.round(turn5Q4Trigger / 1700)}K`);
console.log(`第 6+ 轮 · 攻 Q12 · 全触发        ${turn6Q12Full}\t  ~${Math.round(turn6Q12Full / 1700)}K`);
console.log("");

console.log("=== v0.7.8.2 vs v0.7.9 对比 ===\n");
console.log("v0.7.8.2 第 3 轮:    24672 chars / ~15K tokens");
console.log(`v0.7.9   第 3 轮:    ${turn3Q1} chars / ~${Math.round(turn3Q1 / 1700)}K tokens`);
console.log("");
console.log("v0.7.8.2 第 5 轮:    28457 chars / ~17K tokens");
console.log(`v0.7.9   第 5 轮:    ${turn5Q4Trigger} chars / ~${Math.round(turn5Q4Trigger / 1700)}K tokens`);
console.log("");
console.log("v0.7.8.2 第 6+ 轮:   29287 chars / ~18K tokens");
console.log(`v0.7.9   第 6+ 轮:   ${turn6Q12Full} chars / ~${Math.round(turn6Q12Full / 1700)}K tokens`);
console.log("");

console.log("=== 文件存在性检查 ===\n");
const checks = [
  ["overview", overview > 0],
  ...Object.entries(Q_SIZES).map(([Q, size]) => [`Q file ${Q}`, size > 0]),
  ...Object.entries(ADDON_Q_SIZES).flatMap(([m, qs]) =>
    Object.entries(qs).map(([Q, size]) => [`addon_q ${m}/${Q}`, size > 0])
  ),
];
const failed = checks.filter(([, ok]) => !ok);
if (failed.length === 0) {
  console.log(`✅ 所有 ${checks.length} 个文件就位（overview + 12 Q + 36 addon_q）`);
} else {
  console.log(`❌ ${failed.length} 个文件缺失：`);
  for (const [name] of failed) console.log(`   - ${name}`);
}
