import fs from "node:fs";
import path from "node:path";

export type ModeId = "casual" | "rational" | "scathing";

export interface WakeMode {
  id: ModeId;
  label: string;
  subtitle: string;
  description: string;
  attackIntensity: [number, number];
  temperature: number;
  maxTokens: number;
}

export const MODES: Record<ModeId, WakeMode> = {
  casual: {
    id: "casual",
    label: "随便聊",
    subtitle: "姐不陪你做梦，但也不骂你",
    description: "温和直率，留情面不留幻觉。适合想法还没成型、需要有人帮你捋一捋的时刻。",
    attackIntensity: [0.3, 0.5],
    temperature: 0.8,
    maxTokens: 800,
  },
  rational: {
    id: "rational",
    label: "讲道理",
    subtitle: "我不吵架，我拆结构",
    description: "理性分析，逻辑犀利。适合已经有完整想法、需要被严肃审视的场景。",
    attackIntensity: [0.6, 0.8],
    temperature: 0.5,
    maxTokens: 1200,
  },
  scathing: {
    id: "scathing",
    label: "扇巴掌",
    subtitle: "别做梦了，醒醒",
    description: "毒舌全开，御姐爆裂。适合你已经自我感动、需要被狠狠打醒的时刻。",
    attackIntensity: [0.9, 1.2],
    temperature: 0.9,
    maxTokens: 900,
  },
};

const promptCache: Partial<Record<ModeId, string>> = {};
let arsenalCache: string | null = null;
const IS_DEV = process.env.NODE_ENV !== "production";

const ARSENAL_FILENAME = "_arsenal.md";

function loadArsenal(): string {
  // dev 模式不缓存 arsenal，方便边改边看效果
  if (!IS_DEV && arsenalCache !== null) return arsenalCache;

  const filePath = path.join(process.cwd(), "lib", "prompts", ARSENAL_FILENAME);
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    if (!IS_DEV) arsenalCache = content;
    return content;
  } catch {
    // arsenal 缺失不应阻断主流程：兜底返回空，主 prompt 仍可工作
    if (!IS_DEV) arsenalCache = "";
    return "";
  }
}

export function loadSystemPrompt(mode: ModeId): string {
  // dev 不走缓存，改 .md 立刻生效；生产走缓存，读盘仅一次
  if (!IS_DEV && promptCache[mode]) return promptCache[mode]!;

  const filePath = path.join(process.cwd(), "lib", "prompts", `${mode}.md`);
  const main = fs.readFileSync(filePath, "utf-8");

  // v0.5.0：把弹药库以 reference 形式追加到主 prompt 末尾
  // v0.6.0：F 段强化 forced choice（编号化 + ≥2/≥3 下限 + 反例黑名单）
  const arsenal = loadArsenal();
  const content = arsenal
    ? `${main}\n\n# ============ 弹药库（产品经理硬通货 reference · v0.6.0） ============\n\n${arsenal}`
    : main;

  if (!IS_DEV) promptCache[mode] = content;
  return content;
}

export function getMode(id: string): WakeMode {
  if (id in MODES) return MODES[id as ModeId];
  return MODES.scathing; // 默认扇巴掌（醒醒的灵魂模式）
}
