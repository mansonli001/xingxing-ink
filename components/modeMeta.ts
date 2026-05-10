export type ModeId = "casual" | "rational" | "scathing";

export interface ModeMeta {
  id: ModeId;
  label: string;
  subtitle: string;
  description: string;
  dotColor: string;
  activeBorder: string;
  activeBg: string;
  glowClass: string;
}

/**
 * 三档人设（页面展示层 v3）：
 *
 * 页面展示 ≠ AI 人设 prompt。
 * - 页面展示（本文件）：克制、有记忆点、一句话讲完
 * - AI 人设（lib/prompts/*.md）：可以写得更凌厉、更长
 *
 * 用户看到的：简短吸引 → 点进去体验凌厉。
 */
export const MODE_META: Record<ModeId, ModeMeta> = {
  casual: {
    id: "casual",
    label: "随便聊",
    subtitle: "姐不陪你做梦",
    description:
      "温和直率，留情面不留幻觉。适合想法还没成型、需要有人帮你捋一捋。",
    dotColor: "bg-xx-purple",
    activeBorder: "border-xx-purple",
    activeBg: "bg-xx-purple/15",
    glowClass: "mode-glow-casual",
  },
  rational: {
    id: "rational",
    label: "讲道理",
    subtitle: "我不吵架，我拆结构",
    description:
      "理性分析，逻辑犀利。适合已经有完整想法、需要被严肃审视。",
    dotColor: "bg-xx-gold",
    activeBorder: "border-xx-gold",
    activeBg: "bg-xx-gold/10",
    glowClass: "mode-glow-rational",
  },
  scathing: {
    id: "scathing",
    label: "扇巴掌",
    subtitle: "别做梦了，醒醒",
    description: "毒舌全开，御姐爆裂。适合你已经自我感动、需要被狠狠打醒。",
    dotColor: "bg-xx-red",
    activeBorder: "border-xx-red",
    activeBg: "bg-xx-red/15",
    glowClass: "mode-glow-scathing",
  },
};
