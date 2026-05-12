#!/usr/bin/env node
/**
 * v0.7.9.5 健康检查 · 验证 LLM 输出污染兜底过滤器
 *
 * 验证内容：
 *   1. 段首黑名单关键词整段被 strip（"⚠️ 当前轮次"/"结构铁律核验"/"重新生成中"等）
 *   2. 内部档位代号段（"scathing 档"/"casual 档"/"rational 档"开头）被整段 strip
 *   3. 行首 emoji marker（🟢🟡🔴⚠️🚨）被剥掉，行内自然 emoji 保留
 *   4. 用户原话中合法包含"档"字（"我想做哪一档付费"）不被误伤
 *   5. 流式增量场景下 sanitizeStreamSegments 正确切分完整段 / 不完整尾巴
 *
 * 用法：node scripts/_v0795_sanitizer_health.mjs
 *
 * 实现备注：
 *   本脚本内嵌 sanitizer 逻辑副本以保持独立可运行（无需 ts 编译链）。
 *   实际 sanitizer.ts 由 next build / tsc 验证类型与编译。
 *   两份逻辑必须保持同步——sanitizer.ts 改动后必须同步本文件。
 */

// ====================================================================
// === BEGIN sanitizer 逻辑副本（与 lib/prompts/sanitizer.ts 同步）===
// ====================================================================

const PARAGRAPH_HEAD_BLACKLIST = [
  "⚠️ 当前轮次",
  "当前轮次：",
  "当前轮次:",
  "结构铁律核验",
  "结构铁律通过",
  "核验通过？",
  "核验通过?",
  "重新生成中",
  "整条重写",
  "scathing 档",
  "casual 档",
  "rational 档",
  "scathing档",
  "casual档",
  "rational档",
  "70/20/10",
  "70-20-10",
  "ABC 段",
  "ABC段",
  "forced choice 段",
  "forced choice段",
  "[DIRECTOR_NOTE",
  "DIRECTOR_NOTE",
  "[director_note",
];

const LINE_HEAD_EMOJI_REGEX = /^(\s*)(?:🟢|🟡|🔴|⚠️|🚨)(\s*)/;

function shouldStripParagraph(paragraph) {
  const trimmed = paragraph.trimStart();
  return PARAGRAPH_HEAD_BLACKLIST.some((kw) => trimmed.startsWith(kw));
}

function stripLineHeadEmoji(line) {
  return line.replace(LINE_HEAD_EMOJI_REGEX, "");
}

function sanitizeLLMOutput(text) {
  if (!text) return text;
  const paragraphs = text.split(/\n\n/);
  const cleaned = paragraphs
    .filter((p) => {
      // v0.7.9.5.3：KILL 标记段绝不剥
      if (/\[KILL\][\s\S]*?\[\/KILL\]/.test(p)) return true;
      return !shouldStripParagraph(p);
    })
    .map((p) => {
      if (/\[KILL\][\s\S]*?\[\/KILL\]/.test(p)) return p;
      return p.split("\n").map(stripLineHeadEmoji).join("\n");
    });
  return cleaned.join("\n\n");
}

// v0.7.9.5.3 · 引号包裹自动加粗
function autoBoldQuotedEmphasis(text) {
  if (!text) return text;
  const parts = text.split(/(\[KILL\][\s\S]*?\[\/KILL\])/g);
  return parts
    .map((part) => {
      if (part.startsWith("[KILL]")) return part;
      const subParts = part.split(/(```[\s\S]*?```|`[^`\n]*`|\*\*[^*\n]+\*\*)/g);
      return subParts
        .map((sub, i) => {
          if (i % 2 === 1) return sub;
          let processed = sub.replace(/「([^「」\n]{1,12})」/g, "**$1**");
          processed = processed.replace(/"([^"\n]{1,12})"/g, "**$1**");
          return processed;
        })
        .join("");
    })
    .join("");
}

function sanitizeStreamSegments(buffer) {
  const lastBoundary = buffer.lastIndexOf("\n\n");
  if (lastBoundary < 0) return ["", buffer];
  const completePart = buffer.slice(0, lastBoundary + 2);
  const tail = buffer.slice(lastBoundary + 2);
  return [sanitizeLLMOutput(completePart), tail];
}

// ====================================================================
// === END sanitizer 副本 ===
// ====================================================================

let pass = 0;
let fail = 0;

function assertEq(name, actual, expected) {
  if (actual === expected) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name}`);
    console.log(`     expected: ${JSON.stringify(expected)}`);
    console.log(`     actual:   ${JSON.stringify(actual)}`);
  }
}

function assertContains(name, actual, fragment, shouldContain) {
  const has = actual.includes(fragment);
  if (has === shouldContain) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name}`);
    console.log(
      `     expected ${shouldContain ? "to contain" : "to NOT contain"}: ${JSON.stringify(fragment)}`
    );
    console.log(`     actual: ${JSON.stringify(actual)}`);
  }
}

console.log("=== v0.7.9.5 sanitizer health check ===\n");

// ----------------------------------------------------------------------
// Test 1: 真机暴露的污染样本 — 必须整段 strip
// ----------------------------------------------------------------------
console.log("Test 1 · 真机污染样本（scathing 第 1 轮简历模板）");
const realCase = `⚠️ 当前轮次：第 1 轮 · scathing 档
结构铁律核验通过？ 否 — 重新生成中…

「简历生成模板」？

你让我猜猜。你最近刷到了那些「用 AI 一键生成简历，通过率提升 80%」的软文。`;
const realClean = sanitizeLLMOutput(realCase);
assertContains("整段 strip 当前轮次泄漏", realClean, "当前轮次", false);
assertContains("整段 strip 核验通过泄漏", realClean, "核验通过", false);
assertContains("整段 strip 重新生成中泄漏", realClean, "重新生成中", false);
assertContains("保留正文「简历生成模板」", realClean, "简历生成模板", true);
assertContains("保留正文「软文」", realClean, "软文", true);

// ----------------------------------------------------------------------
// Test 2: 行首 emoji marker — 必须剥掉
// ----------------------------------------------------------------------
console.log("\nTest 2 · 行首 emoji marker 剥离");
assertEq(
  "🟢 行首剥离",
  sanitizeLLMOutput("🟢 刀锋追问（1 把刀）"),
  "刀锋追问（1 把刀）"
);
assertEq("🟡 行首剥离", sanitizeLLMOutput("🟡 第二刀"), "第二刀");
assertEq("🔴 行首剥离", sanitizeLLMOutput("🔴 红线警告"), "红线警告");
assertEq("⚠️ 行首剥离", sanitizeLLMOutput("⚠️ 注意"), "注意");

// ----------------------------------------------------------------------
// Test 3: 行内自然 emoji 保留
// ----------------------------------------------------------------------
console.log("\nTest 3 · 行内自然 emoji 保留");
assertEq(
  "句中 emoji 保留",
  sanitizeLLMOutput("这事 🟢 没那么简单"),
  "这事 🟢 没那么简单"
);

// ----------------------------------------------------------------------
// Test 4: 内部档位代号 — 段首命中整段 strip
// ----------------------------------------------------------------------
console.log("\nTest 4 · 内部档位代号段首 strip");
const modeCase = `scathing 档要硬扇

正文内容 OK

casual 档软一点`;
const modeClean = sanitizeLLMOutput(modeCase);
assertContains("scathing 档段首被剥", modeClean, "scathing 档要硬扇", false);
assertContains("casual 档段首被剥", modeClean, "casual 档软一点", false);
assertContains("中间正文保留", modeClean, "正文内容 OK", true);

// ----------------------------------------------------------------------
// Test 5: 用户合法用词不被误伤（边界保护）
// ----------------------------------------------------------------------
console.log("\nTest 5 · 用户合法用词不被误伤");
assertEq(
  "「哪一档付费」不被误伤（仅含'档'字不触发）",
  sanitizeLLMOutput("你想做哪一档付费？"),
  "你想做哪一档付费？"
);
assertEq(
  "「这一轮我想清楚了」不被误伤",
  sanitizeLLMOutput("这一轮我想清楚了"),
  "这一轮我想清楚了"
);
assertEq(
  "「rational 思考方式」不被误伤（仅 'rational 档' 完整短语才触发）",
  sanitizeLLMOutput("rational 思考方式"),
  "rational 思考方式"
);
assertEq(
  "「重新生成简历」不被误伤（'重新生成中'才触发）",
  sanitizeLLMOutput("你需要重新生成简历"),
  "你需要重新生成简历"
);

// ----------------------------------------------------------------------
// Test 6: 70/20/10 / forced choice 段 / DIRECTOR_NOTE 等内部铁律名
// ----------------------------------------------------------------------
console.log("\nTest 6 · 内部铁律名段首 strip");
assertEq("70/20/10 段首 strip", sanitizeLLMOutput("70/20/10 篇幅铁律"), "");
assertEq(
  "DIRECTOR_NOTE 段首 strip",
  sanitizeLLMOutput("DIRECTOR_NOTE · 仅你可见"),
  ""
);
assertEq(
  "[DIRECTOR_NOTE 段首 strip",
  sanitizeLLMOutput("[DIRECTOR_NOTE · 仅你可见，永不输出]"),
  ""
);

// ----------------------------------------------------------------------
// Test 7: 多段混合 — 部分剥部分留
// ----------------------------------------------------------------------
console.log("\nTest 7 · 多段混合处理");
const mixed = `⚠️ 当前轮次：第 1 轮

正常段落 1

🟢 这是行首被剥的正常内容

正常段落 2

结构铁律核验通过？ 否`;
const mixedClean = sanitizeLLMOutput(mixed);
assertContains("污染段被剥", mixedClean, "当前轮次", false);
assertContains("污染段被剥（结构铁律）", mixedClean, "结构铁律", false);
assertContains("正常段落 1 保留", mixedClean, "正常段落 1", true);
assertContains("正常段落 2 保留", mixedClean, "正常段落 2", true);
assertContains(
  "emoji 行行首剥离后内容保留",
  mixedClean,
  "这是行首被剥的正常内容",
  true
);
assertContains("emoji 行首已剥（不应残留 🟢）", mixedClean, "🟢", false);

// ----------------------------------------------------------------------
// Test 8: 流式增量切段
// ----------------------------------------------------------------------
console.log("\nTest 8 · sanitizeStreamSegments 流式切段");
const [emit1, rest1] = sanitizeStreamSegments("第一段\n\n第二段");
assertEq("无双换行尾的内容算未完成段（emit 含第一段）", emit1, "第一段\n\n");
assertEq("尾部不完整段进 rest", rest1, "第二段");

const [emit2, rest2] = sanitizeStreamSegments("没有边界一段话");
assertEq("无 \\n\\n 边界 → emit 空", emit2, "");
assertEq("无 \\n\\n 边界 → 全进 rest", rest2, "没有边界一段话");

const [emit3, rest3] = sanitizeStreamSegments(
  "⚠️ 当前轮次：第 1 轮\n\n正常段\n\n下一段不完整"
);
assertContains("流式 emit 中污染段被剥", emit3, "当前轮次", false);
assertContains("流式 emit 中正常段保留", emit3, "正常段", true);
assertEq("流式 rest 是不完整尾巴", rest3, "下一段不完整");

// ----------------------------------------------------------------------
// Test 9: 空字符串 / undefined 兜底
// ----------------------------------------------------------------------
console.log("\nTest 9 · 边界条件");
assertEq("空字符串 → 空字符串", sanitizeLLMOutput(""), "");
assertEq("纯换行 → 纯换行", sanitizeLLMOutput("\n\n\n"), "\n\n\n");

// ----------------------------------------------------------------------
// Test 10 · v0.7.9.5.3 · KILL 标记保护
// ----------------------------------------------------------------------
console.log("\nTest 10 · KILL 标记保护（不被任何黑名单误伤）");
const killCase = `正文 diss 段

[KILL]你给的是工具，用户要的是结果，这就是所有工具类产品的死穴。[/KILL]`;
const killClean = sanitizeLLMOutput(killCase);
assertContains("KILL 段被完整保留", killClean, "[KILL]", true);
assertContains("KILL 内容被完整保留", killClean, "工具类产品的死穴", true);
assertContains("正文段保留", killClean, "正文 diss 段", true);

// 极端：KILL 段 emoji 不被剥（保留原样）
const killWithEmoji = `[KILL]🔴 这就是死穴 🟢[/KILL]`;
assertEq(
  "KILL 段内 emoji 不被剥",
  sanitizeLLMOutput(killWithEmoji),
  killWithEmoji
);

// 极端：KILL 标记不会被段首黑名单误伤（KILL 段开头是 [KILL]，不在黑名单）
const killWithBadHead = `⚠️ 当前轮次：第 1 轮

[KILL]这句必须留下[/KILL]`;
const killWithBadClean = sanitizeLLMOutput(killWithBadHead);
assertContains("污染段被剥", killWithBadClean, "当前轮次", false);
assertContains("KILL 段保留", killWithBadClean, "[KILL]这句必须留下[/KILL]", true);

// ----------------------------------------------------------------------
// Test 11 · v0.7.9.5.3 · 引号自动加粗
// ----------------------------------------------------------------------
console.log("\nTest 11 · 引号包裹自动加粗");
assertEq(
  "中文方括号引号「xxx」→ **xxx**",
  autoBoldQuotedEmphasis("用户要的是「结果」不是工具"),
  "用户要的是**结果**不是工具"
);
assertEq(
  '中文双引号 "xxx" → **xxx**',
  autoBoldQuotedEmphasis('他要的是"结果"'),
  "他要的是**结果**"
);
assertEq(
  "已加粗 **xxx** 不动",
  autoBoldQuotedEmphasis("**已加粗** 和「新加粗」"),
  "**已加粗** 和**新加粗**"
);
assertEq(
  "代码段内引号不动",
  autoBoldQuotedEmphasis("`「不要动」`"),
  "`「不要动」`"
);
assertEq(
  "KILL 段内引号不动（保留原话）",
  autoBoldQuotedEmphasis("[KILL]他要的是「结果」[/KILL]"),
  "[KILL]他要的是「结果」[/KILL]"
);
assertEq(
  "超长引号内容（>12字）不加粗",
  autoBoldQuotedEmphasis(
    "用户说「这是一句非常长的引用，超过十二个字应该不被自动加粗处理」"
  ),
  "用户说「这是一句非常长的引用，超过十二个字应该不被自动加粗处理」"
);

// ----------------------------------------------------------------------
// Test 12 · v0.7.9.5.3 · KILL + sanitize + 引号加粗组合
// ----------------------------------------------------------------------
console.log("\nTest 12 · 完整链路组合（sanitize + 引号加粗 → KILL 保留）");
const fullCase = `⚠️ 当前轮次：第 1 轮

正文段，用户要的是「结果」不是工具。

[KILL]你给的是「工具」，用户要的是「结果」。[/KILL]`;
const step1 = sanitizeLLMOutput(fullCase);
const step2 = autoBoldQuotedEmphasis(step1);
assertContains("污染段被剥", step2, "当前轮次", false);
assertContains("正文段引号被加粗", step2, "用户要的是**结果**", true);
assertContains(
  "KILL 段引号保留原话不被加粗（金句保留原味）",
  step2,
  "[KILL]你给的是「工具」，用户要的是「结果」。[/KILL]",
  true
);

// ----------------------------------------------------------------------
console.log("\n=== 结果 ===");
console.log(`通过: ${pass}`);
console.log(`失败: ${fail}`);
console.log(`总计: ${pass + fail}`);

if (fail > 0) {
  process.exit(1);
}
