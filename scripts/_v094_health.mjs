#!/usr/bin/env node
/**
 * v0.7.9.4.1 健康检查 · 验证升级节 + 总则节切片是否正确生效
 *
 * 验证内容：
 *   1. arsenal_addon/{casual,rational,scathing}.md 的"v0.7.9.4 升级"段是否能被切出
 *   2. _response_protocol.md 的"v0.7.9.4 总则"段是否能被切出（且不串入决策树）
 *   3. 检查切片后的关键铁律词是否就位（翻转节奏 / 翻转 ≠ 顾问引导 / 三红线 / 温柔收尾）
 *
 * 用法：node scripts/_v094_health.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function read(rel) {
  try {
    return fs.readFileSync(path.join(ROOT, rel), "utf-8");
  } catch {
    return "";
  }
}

function sliceV094Persona(mode) {
  const full = read(`lib/prompts/arsenal_addon/${mode}.md`);
  if (!full) return "";
  const idx = full.indexOf("## v0.7.9.4 升级");
  if (idx < 0) return "";
  return full.slice(idx).trim();
}

function sliceV094Protocol() {
  const full = read("lib/prompts/_methodology/_response_protocol.md");
  if (!full) return "";
  const startIdx = full.indexOf("## v0.7.9.4 总则");
  if (startIdx < 0) return "";
  const endIdx = full.indexOf("## 决策树", startIdx);
  return endIdx > startIdx
    ? full.slice(startIdx, endIdx).trim()
    : full.slice(startIdx).trim();
}

const REQUIRED_PERSONA_KEYWORDS = {
  casual: ["行业百事通", "嫌弃但宠溺", "翻转节奏", "翻转节奏 ≠ 顾问引导", "三红线"],
  rational: ["资深合伙人", "施舍口吻", "翻转节奏", "三红线"],
  scathing: ["直觉怪兽", "心理学家", "见血封喉", "逻辑吊打", "灵魂审讯", "翻转节奏", "温柔收尾"],
};
const REQUIRED_PROTOCOL_KEYWORDS = [
  "姐姐抬杠基线",
  "翻转节奏",
  "翻转 ≠ 顾问引导",
  "术语转译公式",
  "三红线",
  "ABC 时机",
  "温柔收尾",
];

let pass = 0;
let fail = 0;

console.log("\n=== v0.7.9.4.1 注入链路健康检查 ===\n");

for (const mode of ["casual", "rational", "scathing"]) {
  const slice = sliceV094Persona(mode);
  if (!slice) {
    console.log(`❌ ${mode} 升级节切片失败 — 找不到 "## v0.7.9.4 升级" 标记`);
    fail++;
    continue;
  }
  console.log(`✅ ${mode} 升级节切片成功 (${slice.length} chars)`);
  for (const kw of REQUIRED_PERSONA_KEYWORDS[mode]) {
    if (slice.includes(kw)) {
      console.log(`   ✓ 包含关键词「${kw}」`);
      pass++;
    } else {
      console.log(`   ✗ 缺失关键词「${kw}」`);
      fail++;
    }
  }
}

console.log("");
const protoSlice = sliceV094Protocol();
if (!protoSlice) {
  console.log(`❌ protocol 总则节切片失败`);
  fail++;
} else {
  console.log(`✅ protocol 总则节切片成功 (${protoSlice.length} chars)`);
  if (protoSlice.includes("## 决策树")) {
    console.log(`   ✗ 严重错误：切片串入了"决策树"节，end marker 失败`);
    fail++;
  } else {
    console.log(`   ✓ 切片干净，未串入决策树`);
    pass++;
  }
  for (const kw of REQUIRED_PROTOCOL_KEYWORDS) {
    if (protoSlice.includes(kw)) {
      console.log(`   ✓ 包含关键词「${kw}」`);
      pass++;
    } else {
      console.log(`   ✗ 缺失关键词「${kw}」`);
      fail++;
    }
  }
}

console.log(`\n=== 总计 PASS=${pass} FAIL=${fail} ===`);
process.exit(fail > 0 ? 1 : 0);
