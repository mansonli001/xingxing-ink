/**
 * v0.7.9.5 紧急修复 · LLM 输出污染兜底过滤器
 *
 * 背景：
 *   2026-05-12 真机 scathing 第 1 轮简历模板提问暴露 P0 bug——
 *   LLM 把 system prompt 里的内部 anchor 词（"⚠️ 当前轮次：第 1 轮 · scathing 档"
 *   "结构铁律核验通过？ 否 — 重新生成中…"）原样 echo 到了对用户的回复里。
 *   同时 _arsenal.md 用 🟢🟡🔴 标识档位 → LLM 模仿用 emoji 当 marker。
 *
 * 双层兜底架构：
 *   - 第一层 prompt 治本：index.ts 内部 anchor 词下沉 + 显式输出黑名单指令
 *   - 第二层代码治标：本文件，server 端 SSE chunk 推送前调用 + client 端渲染前调用
 *
 * 算法：
 *   1. 整段判定：按 `\n\n` 切段，段首命中黑名单关键词 → 整段 strip
 *   2. 行首剥离：每行的开头 🟢🟡🔴⚠️ emoji marker 单独剥掉（不剥行内自然出现的）
 *
 * 边界控制：
 *   - 段首匹配必须是"具体短语"，避免误伤用户原话
 *     ❌ 仅匹配"档"字 → 会误伤 "我想做哪一档付费"
 *     ✅ 匹配 "scathing 档" / "casual 档" / "rational 档" 完整短语
 *   - emoji 剥离仅作用于"行首"（含可选前缀空白），保留行内自然 emoji
 *   - sanitize 后段间分隔符保持原样（剥段不留空段，自动合并 \n\n）
 *
 * 性能：
 *   - 关键词列表为 const，编译期固化
 *   - 段判定走 startsWith 数组 some，O(段数 × 关键词数)，关键词常数 < 20
 */

/**
 * 段首黑名单：段落以这些词开头则**整段 strip**
 *
 * 选词原则：
 *   - 必须是 LLM 不可能在自然行文里以此开头的短语
 *   - 必须是内部 anchor / 状态 / 档位代号 的具体表达
 */
const PARAGRAPH_HEAD_BLACKLIST = [
  // === 内部状态泄漏（v0.7.9.5 真机命中）===
  "⚠️ 当前轮次",
  "当前轮次：",
  "当前轮次:",
  "结构铁律核验",
  "结构铁律通过",
  "核验通过？",
  "核验通过?",
  "重新生成中",
  "整条重写",

  // === 内部档位代号（不应出现在对用户回复里）===
  "scathing 档",
  "casual 档",
  "rational 档",
  "scathing档",
  "casual档",
  "rational档",

  // === 内部铁律名 / 章节标识 ===
  "70/20/10",
  "70-20-10",
  "ABC 段",
  "ABC段",
  "forced choice 段",
  "forced choice段",

  // === director note 类指令泄漏 ===
  "[DIRECTOR_NOTE",
  "DIRECTOR_NOTE",
  "[director_note",
];

/**
 * 行首 emoji 黑名单：行首出现这些 emoji 当 marker 则剥掉
 *
 * 注意：仅剥行首（可带前缀空白），保留行内自然 emoji
 */
const LINE_HEAD_EMOJI_REGEX = /^(\s*)(?:🟢|🟡|🔴|⚠️|🚨)(\s*)/;

/**
 * 判断一个段落是否应该被整段 strip
 *
 * 规则：去掉前后空白后，若段落以黑名单任一短语开头 → strip
 */
function shouldStripParagraph(paragraph: string): boolean {
  const trimmed = paragraph.trimStart();
  return PARAGRAPH_HEAD_BLACKLIST.some((kw) =>
    trimmed.startsWith(kw)
  );
}

/**
 * 剥掉单行行首的 emoji marker
 *
 * 例：
 *   "🟢 刀锋追问（1 把刀）"  →  "刀锋追问（1 把刀）"
 *   "  ⚠️ 注意" → "注意"
 *   "句中有🟢emoji" → 保留（不是行首）
 */
function stripLineHeadEmoji(line: string): string {
  return line.replace(LINE_HEAD_EMOJI_REGEX, "");
}

/**
 * 主接口：清理 LLM 输出
 *
 * 流程：
 *   1. 按 `\n\n` 切段
 *   2. 整段判定：命中黑名单 → 丢弃
 *   3. 段内每行：剥行首 emoji
 *   4. 重新拼回
 *
 * v0.7.9.5.3 增强：
 *   - KILL 标记保护：[KILL]xxx[/KILL] 段绝不被任何黑名单误伤（白名单优先级最高）
 *   - 引号自动加粗：「xxx」/ "xxx" 中的强调词自动转成 **xxx** markdown 加粗
 *
 * @param text 原始 LLM 输出（可以是完整一条，也可以是 SSE 累积内容）
 * @returns 清理后的文本；若全部段被剥掉返回空串
 */
export function sanitizeLLMOutput(text: string): string {
  if (!text) return text;

  const paragraphs = text.split(/\n\n/);

  const cleaned = paragraphs
    .filter((p) => {
      // v0.7.9.5.3：KILL 标记段绝不剥（白名单最高优先级，防止误伤）
      if (/\[KILL\][\s\S]*?\[\/KILL\]/.test(p)) return true;
      return !shouldStripParagraph(p);
    })
    .map((p) => {
      // 段内行首 emoji 剥离（保留 KILL 段不动）
      if (/\[KILL\][\s\S]*?\[\/KILL\]/.test(p)) return p;
      return p.split("\n").map(stripLineHeadEmoji).join("\n");
    });

  return cleaned.join("\n\n");
}

/**
 * v0.7.9.5.3 · 引号包裹强调词自动加粗
 *
 * 把「xxx」中文方括号引号、"xxx" 中文双引号 中的内容自动转成 **xxx** markdown 加粗。
 * （仅限 2-12 字以内的"短语"，避免把整段对话也包进去）
 *
 * 边界保护：
 *   - 已在 ` ` 反引号内（行内代码）→ 不动
 *   - 已在 ``` ``` 代码块内 → 不动
 *   - 已在 ** ** 内（已加粗）→ 不动
 *   - KILL 段内 → 不动（保留原话原样）
 *   - 长度 > 12 字 → 不动（这是引号引用的长句而不是强调词）
 *
 * @param text markdown 文本
 * @returns 转换后的文本
 */
export function autoBoldQuotedEmphasis(text: string): string {
  if (!text) return text;

  // 切段：先把 KILL 段保护起来，处理完再拼回
  const parts = text.split(/(\[KILL\][\s\S]*?\[\/KILL\])/g);

  return parts
    .map((part) => {
      // KILL 段保留原样
      if (part.startsWith("[KILL]")) return part;

      // 用同一套切分模式保护已包裹片段（反引号/已加粗/代码块）
      const subParts = part.split(
        /(```[\s\S]*?```|`[^`\n]*`|\*\*[^*\n]+\*\*)/g
      );

      return subParts
        .map((sub, i) => {
          if (i % 2 === 1) return sub; // 已包裹段保留
          // 中文方括号引号 「xxx」 → **xxx**
          //   要求：xxx 长度 1-12 字符，不含换行
          let processed = sub.replace(
            /「([^「」\n]{1,12})」/g,
            "**$1**"
          );
          // 中文双引号 "xxx" → **xxx**
          processed = processed.replace(
            /"([^"\n]{1,12})"/g,
            "**$1**"
          );
          return processed;
        })
        .join("");
    })
    .join("");
}

/**
 * 流式增量场景的辅助：
 *
 * SSE 推送时，每个 chunk 可能跨段，sanitizer 需要按"完整段"判定才安全。
 * 调用方应该按 `\n\n` 边界 flush——这个函数返回 [可发送部分, 待累积尾部]。
 *
 * 用法（route.ts SSE 循环里）：
 *   ```
 *   buffer += chunk;
 *   const [emit, rest] = sanitizeStreamSegments(buffer);
 *   buffer = rest;
 *   if (emit) send("delta", { content: emit });
 *   ```
 *   流结束时单独把 buffer 也跑一次 sanitizeLLMOutput。
 */
export function sanitizeStreamSegments(
  buffer: string
): [emit: string, rest: string] {
  // 找最后一个 \n\n 边界，前面是完整段，后面是不完整尾巴
  const lastBoundary = buffer.lastIndexOf("\n\n");
  if (lastBoundary < 0) {
    // 整个 buffer 都是一段未完整 → 全留着等下个 chunk
    return ["", buffer];
  }
  const completePart = buffer.slice(0, lastBoundary + 2); // 含 \n\n
  const tail = buffer.slice(lastBoundary + 2);
  return [sanitizeLLMOutput(completePart), tail];
}
