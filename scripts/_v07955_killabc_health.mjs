#!/usr/bin/env node
/**
 * v0.7.9.5.5.2 健康检查 · ABC 同行连写 + KILL 完全漏标 容错
 *
 * 用真实用户截图的失败 case 验证修复后逻辑能救回。
 *
 * 用法：node scripts/_v07955_killabc_health.mjs
 *
 * 注意：内嵌 extractOptions / extractKillStamp 逻辑副本（与 components/OptionButtons.tsx
 * 和 components/KillStamp.tsx 保持同步——任一文件改动须同步本脚本）。
 */

// ============================================================
// === BEGIN extractOptions 副本 ===
// ============================================================
function validateContinuous(options) {
  if (options.length < 2) return [];
  for (let i = 0; i < options.length; i++) {
    const expected = String.fromCharCode("A".charCodeAt(0) + i);
    if (options[i].letter !== expected) return [];
  }
  return options;
}

function extractOptions(paragraph) {
  if (!paragraph) return [];
  // 策略 1
  const lines = paragraph.split("\n");
  const lineOptions = [];
  let currentLetter = null;
  let currentText = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const m = trimmed.match(/^([A-D])[.．、][\s　]*(.+)$/);
    if (m) {
      if (currentLetter) {
        const t = currentText.join(" ").trim();
        if (t.length >= 8) lineOptions.push({ letter: currentLetter, text: t });
      }
      currentLetter = m[1];
      currentText = [m[2]];
    } else if (currentLetter) {
      currentText.push(trimmed);
    }
  }
  if (currentLetter) {
    const t = currentText.join(" ").trim();
    if (t.length >= 8) lineOptions.push({ letter: currentLetter, text: t });
  }
  const v1 = validateContinuous(lineOptions);
  if (v1.length >= 2) return v1;

  // 策略 2 同行连写兜底
  const flatText = paragraph.replace(/\s+/g, " ").trim();
  const markerCount = (flatText.match(/(?:^|\s)([A-D])[.．、]\s+/g) || []).length;
  if (markerCount < 2) return [];
  const segOptions = [];
  const marked = flatText.replace(/(^|\s)([A-D])[.．、]\s*/g, "\u0001$2|");
  const chunks = marked.split("\u0001").filter(Boolean);
  for (const chunk of chunks) {
    const m = chunk.match(/^([A-D])\|(.+)$/);
    if (!m) continue;
    const letter = m[1];
    const text = m[2].trim();
    if (text.length >= 8) segOptions.push({ letter, text });
  }
  return validateContinuous(segOptions);
}

// ============================================================
// === BEGIN extractKillStamp 副本 ===
// ============================================================
function detectKillByFeature(text) {
  const paragraphs = text.split(/\n\n/).filter((p) => p.trim());
  if (paragraphs.length === 0) return null;
  const lastPara = paragraphs[paragraphs.length - 1].trim();
  if (/(?:^|\s)[A-D][.．、]\s/.test(lastPara)) return null;
  if (lastPara.includes("\n")) return null;
  if (lastPara.length < 10 || lastPara.length > 60) return null;
  const KILL_KEYWORDS = [
    /死穴/,
    /真相/,
    /本质/,
    /你不是.{1,8}你是/,
    /不是.{1,8}就行/,
    /你才是/,
    /这就是/,
    /你给的是/,
    /你以为是/,
    /生意就得/,
    /账本/,
    /醒醒/,
    /答案/,
    /钱赚不到/,
    /路走错了/,
    /想清楚/,
    /骗自己/,
  ];
  const matched = KILL_KEYWORDS.some((kw) => kw.test(lastPara));
  if (!matched) return null;
  return { kill: lastPara, raw: paragraphs[paragraphs.length - 1] };
}

function extractKillStamp(text) {
  if (!text) return { content: text, kill: null };
  const standard = text.match(/\[KILL\]([\s\S]*?)\[\/KILL\]/);
  if (standard) {
    const kill = standard[1].trim();
    if (kill) {
      const content = text.replace(/\n*\[KILL\][\s\S]*?\[\/KILL\]\n*/, "").trim();
      return { content, kill };
    }
  }
  const onlyEnd = text.match(/(?:^|\n\n)([^\n]+?)\[\/KILL\]/);
  if (onlyEnd) {
    const kill = onlyEnd[1].trim();
    if (kill && kill.length >= 8 && kill.length <= 80) {
      const content = text.replace(/\n*[^\n]*?\[\/KILL\]\n*/, "").trim();
      return { content, kill };
    }
  }
  const onlyStart = text.match(/\[KILL\]([\s\S]+?)(?:\n\n|$)/);
  if (onlyStart) {
    const kill = onlyStart[1].trim();
    if (kill && kill.length >= 8 && kill.length <= 80) {
      const content = text.replace(/\n*\[KILL\][\s\S]+?(?=\n\n|$)/, "").trim();
      return { content, kill };
    }
  }
  const fallback = detectKillByFeature(text);
  if (fallback) {
    const content = text.replace(fallback.raw, "").trim();
    return { content: content.replace(/\n{3,}/g, "\n\n"), kill: fallback.kill };
  }
  return { content: text, kill: null };
}

// ============================================================
// === Test runner ===
// ============================================================
let pass = 0;
let fail = 0;
function assertEq(name, actual, expected) {
  const eq = JSON.stringify(actual) === JSON.stringify(expected);
  if (eq) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name}`);
    console.log(`     期望: ${JSON.stringify(expected)}`);
    console.log(`     实际: ${JSON.stringify(actual)}`);
  }
}
function assertTrue(name, cond, hint) {
  if (cond) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name} (${hint || ""})`);
  }
}

// ============================================================
// === Test 1 · 标准换行 ABC 仍然命中（v0.7.9.5.3 兼容性回归）===
// ============================================================
console.log("\nTest 1 · 标准换行格式 ABC（兼容性回归）");
const t1 = `A. 选项一……做成小工具
B. 选项二……做数据接口
C. 选项三……快钱再说`;
const opts1 = extractOptions(t1);
assertEq("3 个选项命中", opts1.length, 3);
assertEq("第一个是 A", opts1[0]?.letter, "A");

// ============================================================
// === Test 2 · 用户截图真实失败 case · ABCD 同行连写 ===
// ============================================================
console.log("\nTest 2 · v0.7.9.5.5.2 同行连写兜底（用户截图 case）");
const t2 = `A. 卖会员——按月收费，比如19.9一个月，用户付了钱才能看完整的饮食方案。 B. 卖广告/带货——用户免费看方案，你推荐"减肥必备的鸡胸肉""0卡糖浆"，赚佣金。 C. 卖课程/服务——用户付钱进群，你或者你的营养师团队提供更深入的指导和陪伴。 D. 我还没想清楚，先圈用户再说。`;
const opts2 = extractOptions(t2);
assertEq("ABCD 4 个选项全部命中", opts2.length, 4);
assertEq("A 选项", opts2[0]?.letter, "A");
assertEq("D 选项（v0.7.9.5.5.2 新增 4 选项支持）", opts2[3]?.letter, "D");
assertTrue(
  "A 文本含'卖会员'",
  opts2[0]?.text.includes("卖会员"),
  opts2[0]?.text
);
assertTrue(
  "D 文本含'还没想清楚'",
  opts2[3]?.text.includes("还没想清楚"),
  opts2[3]?.text
);

// ============================================================
// === Test 3 · 排除误识别 ===
// ============================================================
console.log("\nTest 3 · 边界保护（不误识别）");
// 普通话里偶现 A. 不应识别
const t3a = `第一段普通话。还有 A. 这种情况我没考虑。`;
assertEq("仅 1 个 A. 不识别", extractOptions(t3a), []);

// 不连续 A C 不识别
const t3b = `A. 选项一长一点的内容
C. 选项三跳过了 B`;
assertEq("A→C 跳过不识别", extractOptions(t3b), []);

// 选项过短 < 8 字
const t3c = `A. 是
B. 不是
C. 也行`;
assertEq("选项过短不识别", extractOptions(t3c), []);

// ============================================================
// === Test 4 · KILL 标记三层容错（v0.7.9.5.3.1 回归）===
// ============================================================
console.log("\nTest 4 · KILL 标记三层容错（回归）");
const k1 = `正文段\n\n[KILL]这就是所有工具类产品的死穴。[/KILL]`;
const r1 = extractKillStamp(k1);
assertEq("标准格式 kill", r1.kill, "这就是所有工具类产品的死穴。");

const k2 = `正文段\n\n你给的是工具，用户要的是结果。[/KILL]`;
const r2 = extractKillStamp(k2);
assertTrue("漏开头标记被救回", r2.kill !== null, `kill=${r2.kill}`);

const k3 = `正文段\n\n[KILL]这就是所有工具类产品的死穴。`;
const r3 = extractKillStamp(k3);
assertTrue("漏结尾标记被救回", r3.kill !== null, `kill=${r3.kill}`);

// ============================================================
// === Test 5 · v0.7.9.5.5.2 第四层兜底 · 完全无标记 ===
// ============================================================
console.log("\nTest 5 · v0.7.9.5.5.2 完全无标记按金句特征兜底");

// 用户截图真实 case
const k5a = `（前面正文……）

A. 选项一长一点的内容
B. 选项二长一点的内容

你不是在做一个产品，你是在做一个生意。生意就得有账本，不是有用户就行。`;
const r5a = extractKillStamp(k5a);
assertTrue(
  "用户截图末段金句被兜底识别",
  r5a.kill !== null,
  `kill=${r5a.kill}`
);
assertTrue(
  "kill 内容正确",
  r5a.kill && r5a.kill.includes("生意就得"),
  r5a.kill
);
assertTrue(
  "正文剥掉了金句段",
  !r5a.content.includes("生意就得"),
  `content=${r5a.content}`
);

// 包含'死穴'关键词
const k5b = `分析段。\n\nABC 不是末段。\n\n这就是所有工具类产品的死穴。`;
const r5b = extractKillStamp(k5b);
assertTrue("含'死穴'关键词被识别", r5b.kill !== null, `kill=${r5b.kill}`);

// 含'你给的是'
const k5c = `分析段。\n\n你给的是工具，用户要的是结果。`;
const r5c = extractKillStamp(k5c);
assertTrue("含'你给的是'被识别", r5c.kill !== null, `kill=${r5c.kill}`);

// ============================================================
// === Test 6 · 第四层兜底边界保护（不误识别）===
// ============================================================
console.log("\nTest 6 · 第四层兜底边界保护");

// 末段是 ABC 段不识别
const k6a = `分析段。\n\nA. 选项一……\nB. 选项二……\nC. 选项三……`;
assertEq("末段是 ABC 不识别为 KILL", extractKillStamp(k6a).kill, null);

// 末段长度 < 10 不识别
const k6b = `分析段。\n\n太短。`;
assertEq("末段过短不识别", extractKillStamp(k6b).kill, null);

// 末段长度 > 60 不识别
const k6c = `分析段。\n\n` + "你给的是工具".repeat(20);
assertEq("末段过长不识别", extractKillStamp(k6c).kill, null);

// 末段没金句关键词不识别
const k6d = `分析段。\n\n这是一段普通的总结说明，里面没有任何金句关键词。`;
assertEq("无金句关键词不识别", extractKillStamp(k6d).kill, null);

// 末段含换行不识别（金句必须单行）
const k6e = `分析段。\n\n你给的是工具，\n用户要的是结果。`;
const r6e = extractKillStamp(k6e);
// 注：split('\n\n') 后这段是 "你给的是工具，\n用户要的是结果。" 含 \n → 拒绝
assertEq("末段含换行不识别", r6e.kill, null);

// ============================================================
console.log("\n=== 结果 ===");
console.log(`通过: ${pass}`);
console.log(`失败: ${fail}`);
console.log(`总计: ${pass + fail}`);
if (fail > 0) process.exit(1);
