/**
 * 弹药库智能抽条器（v0.7.4）
 *
 * 从 _arsenal.md 按用户输入的关键词命中，动态抽 2-3 条相关弹药，
 * 而不是把整个 202 行弹药库 full-prepend 给 LLM——避免注意力衰减。
 *
 * 命中逻辑：
 * 1. 按 A1-A10 的「触发词」列表扫描用户输入（当前消息 + 最近 3 轮历史摘要）
 * 2. 命中的 section 按分数排序，抽前 2-3 条
 * 3. 无命中时返回空字符串（宁可不注入，也不硬塞无关内容，避免幻觉）
 */

import fs from "node:fs";
import path from "node:path";

interface ArsenalSection {
  id: string; // A1, A2, ...
  title: string; // "招聘 / HR 类"
  keywords: string[]; // 触发词
  content: string; // 完整段落内容（包括标题、触发词、平台、数字锚、杀招方向）
}

const IS_DEV = process.env.NODE_ENV !== "production";
let arsenalCache: ArsenalSection[] | null = null;

/**
 * 解析 _arsenal.md，把 A1-A10 段落结构化
 */
function parseArsenal(): ArsenalSection[] {
  if (!IS_DEV && arsenalCache) return arsenalCache;

  const filePath = path.join(process.cwd(), "lib", "prompts", "_arsenal.md");
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf-8");
  } catch {
    if (!IS_DEV) arsenalCache = [];
    return [];
  }

  const sections: ArsenalSection[] = [];
  // 按 ### A 开头的三级标题切分
  const blocks = raw.split(/^### (A\d+)\s+(.+)$/m);
  // split 结果：[前导, id1, title1, content1, id2, title2, content2, ...]
  for (let i = 1; i < blocks.length; i += 3) {
    const id = blocks[i]?.trim();
    const title = blocks[i + 1]?.trim();
    const content = blocks[i + 2] || "";
    if (!id || !title) continue;

    // 从 content 里提取触发词行
    const triggerMatch = content.match(/\*\*触发词\*\*[:：]\s*(.+)/);
    const triggerLine = triggerMatch ? triggerMatch[1] : "";
    const keywords = triggerLine
      .split(/[、,，\s]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    // content 截到下一个 ### 之前（已经是天然切分，但可能包含后续内容的残留）
    const cleanContent = content.split(/^### /m)[0].trim();

    sections.push({
      id,
      title,
      keywords,
      // 组装成完整可注入片段
      content: `### ${id} ${title}\n\n${cleanContent}`,
    });
  }

  if (!IS_DEV) arsenalCache = sections;
  return sections;
}

/**
 * 计算一段文本对某个 section 的命中分数
 * 命中一个关键词 = 1 分，多个关键词叠加
 */
function matchScore(text: string, keywords: string[]): number {
  let score = 0;
  for (const kw of keywords) {
    if (!kw) continue;
    if (text.includes(kw)) {
      score += 1;
      // 触发词如果在用户文本里出现多次，再加分
      const occurrences = text.split(kw).length - 1;
      if (occurrences > 1) score += (occurrences - 1) * 0.3;
    }
  }
  return score;
}

/**
 * 从弹药库按命中抽 N 条
 *
 * @param userContext 用户当前消息 + 历史摘要拼接文本
 * @param n 抽取数量（默认 2）
 * @returns 拼接好的弹药内容；无命中返回空字符串
 */
export function pickArsenal(userContext: string, n = 2): string {
  const sections = parseArsenal();
  if (sections.length === 0) return "";

  const ranked = sections
    .map((s) => ({ section: s, score: matchScore(userContext, s.keywords) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n);

  if (ranked.length === 0) return "";

  const header = `## 弹药库（仅供参考 · 按场景命中）\n\n> 以下是针对用户 idea 场景的真实竞品/数字/法规信息，用作硬通货引用。\n> **仅在直接相关时使用**——不要硬塞无关弹药，也不要编造。\n`;

  return header + "\n" + ranked.map((r) => r.section.content).join("\n\n");
}

/**
 * 调试用：列出所有 sections 方便检查
 */
export function listArsenalSections(): Array<{ id: string; title: string; keywords: string[] }> {
  return parseArsenal().map(({ id, title, keywords }) => ({ id, title, keywords }));
}
