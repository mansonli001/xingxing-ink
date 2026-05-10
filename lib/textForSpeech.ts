/**
 * 把 Markdown 文本转成"适合语音合成的纯文本"
 * ============================================================
 *
 * 背景：v0.4.2 出现过一个 bug：预制回复里残留的 `**...**` 加粗符号被火山 TTS
 * 直接念成"星号星号"，浪费 TTS 额度且听感破坏。原因是 synth-presets.js
 * 没接入剥离逻辑，绕过了 /api/tts 的清洗。
 *
 * 解决：把剥离函数抽到公共模块，**任何送往 TTS 的文本必须先过这里**。
 *
 * 谁该用：
 *   - app/api/tts/route.ts （实时合成）
 *   - scripts/synth-presets.js （预制合成）
 *   - 未来任何调用火山/其它 TTS 的地方
 *
 * v0.4.2.1 新增：applySpeechReadings —— 把容易读错的英文/缩写做读音映射，
 * 不影响前端显示原文（如 H800 视觉保留，TTS 时映射成 "H 八百"）
 */

/** 把 Markdown 转成 TTS 友好的纯文本（去掉所有星号、井号、括号链接等） */
export function stripForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "") // 多行代码块
    .replace(/`([^`]+)`/g, "$1") // 行内代码
    .replace(/^#{1,6}\s+/gm, "") // 标题前缀
    .replace(/\*\*([^*]+)\*\*/g, "$1") // **粗体**
    .replace(/\*([^*]+)\*/g, "$1") // *斜体*
    .replace(/__([^_]+)__/g, "$1") // __粗体__
    .replace(/_([^_]+)_/g, "$1") // _斜体_
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [text](url)
    .replace(/^[\s]*[-*+]\s+/gm, "") // 列表项 - * +
    .replace(/^[\s]*\d+\.\s+/gm, "") // 列表项 1.
    .replace(/\n{3,}/g, "\n\n") // 多余空行
    .trim();
}

/**
 * 读音映射表（v0.4.2.1）
 *
 * 用途：把容易让 TTS 念错的英文/缩写/数字组合，映射成更自然的中文/分隔读法。
 * 原则：
 *   - 越精确越好（前缀完整匹配，避免误伤）
 *   - 大小写敏感（H800 ≠ h800）
 *   - 仅替换 TTS 文本，前端原文不变
 *
 * 加新条目时：先在 9 条预制里实测听感，再加。
 */
const SPEECH_READINGS: Array<{ from: RegExp | string; to: string; note?: string }> = [
  // 关键硬伤：H800 不能读成 "H eight hundred" 或 "H 八百零零"
  { from: /\bH800\b/g, to: "H 八百", note: "英伟达芯片型号，中文场景必须中文化" },

  // Character.AI 的 "." 容易被读成"点"，影响节奏
  { from: /Character\.AI/g, to: "Character A I", note: "去点 + 字母分读" },

  // 未来加的话写在这里：
  // { from: /\bGPT-?4\b/g, to: "G P T 四" },
  // { from: /\bDeepSeek\b/g, to: "深度寻" }, // 暂不加，英语原读法 OK
  // { from: /\ball[\s-]?in\b/gi, to: "all in" }, // 暂不加，英语 OK
];

/** 把读音映射应用到文本（仅用于 TTS 输入，不修改前端显示原文） */
export function applySpeechReadings(text: string): string {
  let result = text;
  for (const rule of SPEECH_READINGS) {
    if (typeof rule.from === "string") {
      result = result.split(rule.from).join(rule.to);
    } else {
      result = result.replace(rule.from, rule.to);
    }
  }
  return result;
}

/**
 * 检测文本里**残留的 markdown 噪声字符**——
 * 如果剥离后还有这些字符，说明剥离函数有 bug 或文本含特殊情况，应当告警。
 *
 * 返回：[] 表示干净；非空数组表示问题字符列表
 */
export function detectMarkdownNoise(text: string): string[] {
  const issues: string[] = [];
  // 检测剥离后是否还有以下噪声
  if (text.includes("**")) issues.push("** (粗体未剥离)");
  if (/(?<!\d)\*(?!\d)/.test(text)) issues.push("* (单星号残留)");
  if (text.includes("__")) issues.push("__ (双下划线粗体)");
  if (/(?<!^)#{1,6}\s/.test(text)) issues.push("#... (标题残留)");
  if (/```/.test(text)) issues.push("``` (代码块残留)");
  if (/\[[^\]]+\]\([^)]+\)/.test(text)) issues.push("[](...) (链接残留)");
  return issues;
}

/**
 * 一站式：剥离 markdown + 应用读音映射 + 校验残留
 *
 * **任何送给 TTS 的文本都应该过这个函数**。
 *
 * 用在严格守卫场景（如脚本批量合成时），不要用在用户实时输入路径上
 * —— 实时输入用宽松的 stripForSpeech + applySpeechReadings 即可，不要抛错。
 */
export function prepareForSpeech(text: string): string {
  const cleaned = stripForSpeech(text);
  const issues = detectMarkdownNoise(cleaned);
  if (issues.length > 0) {
    throw new Error(
      `文本含 markdown 噪声未能剥离：${issues.join(" / ")}\n剥离后片段：${cleaned.slice(0, 200)}`
    );
  }
  return applySpeechReadings(cleaned);
}

// 别名：兼容旧名字
export const strictStripForSpeech = prepareForSpeech;

