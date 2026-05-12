/**
 * v0.7.8 方法论层调用器（开源骨架 · 暴露接口不暴露内容）
 *
 * 真实的 markdown 内容存在 `xingxing-ink-mind` private repo，
 * 通过 symlink 链入：
 *   - lib/prompts/_methodology/  → ../../../xingxing-ink-mind/_methodology
 *   - lib/prompts/arsenal_addon/ → ../../../xingxing-ink-mind/arsenal_addon
 *
 * 本文件只暴露接口；缺失文件时全部返回空字符串，主流程不阻塞。
 *
 * 部署：
 *   - 本地 dev：手动 git clone xingxing-ink-mind 到 sibling 目录 + 上述 symlink
 *   - Vercel：vercel.json 的 buildCommand 用 MIND_REPO_TOKEN 拉 private repo + symlink + next build
 */

import fs from "node:fs";
import path from "node:path";
import type { ModeId } from "./index";

const IS_DEV = process.env.NODE_ENV !== "production";

// 独立缓存（不和 index.ts 的 fileCache 互相污染）
const methodologyCache: Record<string, string> = {};

/**
 * 读取私藏目录下的文件。
 * 缺失返回空字符串（保底兜底，不阻断主流程）。
 */
function loadPrivate(relPath: string): string {
  if (!IS_DEV && methodologyCache[relPath] !== undefined) {
    return methodologyCache[relPath];
  }

  const fullPath = path.join(process.cwd(), "lib", "prompts", relPath);
  try {
    const content = fs.readFileSync(fullPath, "utf-8");
    if (!IS_DEV) methodologyCache[relPath] = content;
    return content;
  } catch {
    if (!IS_DEV) methodologyCache[relPath] = "";
    return "";
  }
}

// ========================================================================
// 公开接口
// ========================================================================

/**
 * 加载五维矩阵 v1.0（12 问 × 五维 × 三档主攻区）
 *
 * 文件：`_methodology/_matrix_v1.md`
 * 缺失返回空字符串。
 *
 * @deprecated v0.7.9+ 推荐使用 `loadMatrixOverview()` + `loadQuestionFile()` 的动态组合，
 *   全量 matrix 仅作为 fallback 兜底。
 */
export function loadMethodology(): string {
  return loadPrivate("_methodology/_matrix_v1.md");
}

/**
 * v0.7.9 · 加载 12 问总览地图（永远注入 · ~600 tokens）
 *
 * 文件：`_methodology/_matrix_overview.md`
 * 缺失返回空字符串（fallback 走 loadMethodology() 全量版）。
 */
export function loadMatrixOverview(): string {
  return loadPrivate("_methodology/_matrix_overview.md");
}

/**
 * v0.7.9 · 加载单个问题的详细弹药（按 picker 结果动态注入）
 *
 * 文件：`_methodology/questions/Qn.md`（n = 1..12）
 * 每个文件 ~400 tokens。缺失返回空字符串。
 */
export function loadQuestionFile(qNumber: string): string {
  // 安全检查：qNumber 必须是 Q1-Q12 之一
  if (!/^Q([1-9]|1[0-2])$/.test(qNumber)) {
    return "";
  }
  return loadPrivate(`_methodology/questions/${qNumber}.md`);
}

/**
 * v0.7.9 · 加载档位 × 单题的特色加密弹药（在 questions/Qn.md 通用弹药基础上加层）
 *
 * 文件：`arsenal_addon/{mode}_q/Qn.md`
 * 每个文件 ~150 tokens。缺失返回空字符串。
 */
export function loadArsenalAddonQ(mode: ModeId, qNumber: string): string {
  if (!/^Q([1-9]|1[0-2])$/.test(qNumber)) {
    return "";
  }
  return loadPrivate(`arsenal_addon/${mode}_q/${qNumber}.md`);
}

/**
 * 加载诊断书模板（三章 + 进度条 + 裁决书 + 下次聊建议）
 *
 * 文件：`_methodology/_diagnosis_template.md`
 * 缺失返回空字符串。
 */
export function loadDiagnosisTemplate(): string {
  return loadPrivate("_methodology/_diagnosis_template.md");
}

/**
 * 加载答不出来 SOP（三档差异化处理）
 *
 * 文件：`_methodology/_response_protocol.md`
 * 三档共用一份文档，由档位 prompt 自行调用对应段。
 * 缺失返回空字符串。
 */
export function loadResponseProtocol(_mode: ModeId): string {
  // 当前 v1.0：三档共用同一文件，参数 _mode 预留给 v1.1+ 的分档加载
  return loadPrivate("_methodology/_response_protocol.md");
}

/**
 * 加载三档主攻区毒蛇追问增量弹药
 *
 * 文件：`arsenal_addon/{mode}.md`
 * 按档抽对应文件。缺失返回空字符串。
 */
export function loadArsenalAddon(mode: ModeId): string {
  return loadPrivate(`arsenal_addon/${mode}.md`);
}

/**
 * v0.7.9.4 · 加载档位"v0.7.9.4 升级节"（视角分工 + 配比硬规则 + 翻转节奏）
 *
 * 这一节是**横切规则**（含第 1-2 轮翻转节奏 / 术语转译公式 / 三红线 / 温柔收尾时机），
 * 必须**从第 1 轮就注入**，否则 v0.7.9.4 改造的关键内容形同虚设。
 *
 * 提取策略：从 `arsenal_addon/{mode}.md` 中切出 "## v0.7.9.4 升级" 之后的全部内容。
 * 这样既保留 Q1-Q12 弹药仅在第 3+ 轮通过 loadArsenalAddon 注入，
 * 又能让升级节横切规则永远在线。
 *
 * 缺失或 v0.7.9.4 节不存在时返回空字符串（安全降级）。
 */
export function loadV094Persona(mode: ModeId): string {
  const full = loadPrivate(`arsenal_addon/${mode}.md`);
  if (!full) return "";
  const marker = "## v0.7.9.4 升级";
  const idx = full.indexOf(marker);
  if (idx < 0) return "";
  return full.slice(idx).trim();
}

/**
 * v0.7.9.4 · 加载 response_protocol 顶部"7 条横切总则"
 *
 * 这一节是**三档共同抬杠基线**（姐姐抬杠 / 翻转节奏 / 翻转 ≠ 顾问引导 /
 * 术语转译 / 三红线 / ABC 时机 / 温柔收尾），必须**从第 1 轮就注入**，
 * 不能藏在"答不出来 SOP 触发逻辑"里——大部分用户根本不会触发那些 trigger 词。
 *
 * 提取策略：从 `_methodology/_response_protocol.md` 切出
 * "## v0.7.9.4 总则" 到 "## 决策树" 之间的内容（仅总则节，不带原 SOP）。
 * 原 SOP（决策树及以下）仍由 loadResponseProtocol 在 trigger 命中时注入。
 *
 * 缺失或节区找不到时返回空字符串（安全降级）。
 */
export function loadV094Protocol(): string {
  const full = loadPrivate("_methodology/_response_protocol.md");
  if (!full) return "";
  const startMarker = "## v0.7.9.4 总则";
  const endMarker = "## 决策树";
  const startIdx = full.indexOf(startMarker);
  if (startIdx < 0) return "";
  const endIdx = full.indexOf(endMarker, startIdx);
  // 截取到决策树之前；找不到结束标记就截到文末
  const slice = endIdx > startIdx ? full.slice(startIdx, endIdx) : full.slice(startIdx);
  return slice.trim();
}

/**
 * 加载单轮回复结构铁律（70/20/10）
 *
 * 文件：`dynamic/_response_structure.md`
 * 这一份是开源的（结构铁律是骨架不是弹药），但放在 dynamic 目录便于调用。
 * 缺失返回空字符串。
 */
export function loadResponseStructure(): string {
  // _response_structure.md 在 dynamic 目录下（开源），不在私藏区
  // 这里复用 loadPrivate 仅因为 fs 路径同构，逻辑上它属于 dynamic 层
  return loadPrivate("dynamic/_response_structure.md");
}

// ========================================================================
// 健康检查（仅 dev 模式 · 用于诊断 symlink 是否就位）
// ========================================================================

/**
 * 检查私藏方法论层文件是否就位。
 * 仅供 dev 调试调用，不参与生产逻辑。
 */
export function checkMethodologyHealth(): {
  matrix: boolean;
  diagnosis: boolean;
  protocol: boolean;
  arsenalAddon: { casual: boolean; rational: boolean; scathing: boolean };
} {
  return {
    matrix: loadMethodology().length > 0,
    diagnosis: loadDiagnosisTemplate().length > 0,
    protocol: loadResponseProtocol("scathing").length > 0,
    arsenalAddon: {
      casual: loadArsenalAddon("casual").length > 0,
      rational: loadArsenalAddon("rational").length > 0,
      scathing: loadArsenalAddon("scathing").length > 0,
    },
  };
}
