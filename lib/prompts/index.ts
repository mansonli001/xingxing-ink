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
const IS_DEV = process.env.NODE_ENV !== "production";

export function loadSystemPrompt(mode: ModeId): string {
  // dev 不走缓存，改 .md 立刻生效；生产走缓存，读盘仅一次
  if (!IS_DEV && promptCache[mode]) return promptCache[mode]!;

  const filePath = path.join(process.cwd(), "lib", "prompts", `${mode}.md`);
  const content = fs.readFileSync(filePath, "utf-8");
  if (!IS_DEV) promptCache[mode] = content;
  return content;
}

export function getMode(id: string): WakeMode {
  if (id in MODES) return MODES[id as ModeId];
  return MODES.scathing; // 默认扇巴掌（醒醒的灵魂模式）
}
