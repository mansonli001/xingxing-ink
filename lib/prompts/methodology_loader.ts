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
 */
export function loadMethodology(): string {
  return loadPrivate("_methodology/_matrix_v1.md");
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
