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
 * 三档人设递进设计（2026-05-10 v2）：
 *
 * ┌─────────┬─────────────┬──────────────────────┬─────────────────┐
 * │  档     │  探照灯照哪  │   招牌动作（AI 没有）│   subtitle      │
 * ├─────────┼─────────────┼──────────────────────┼─────────────────┤
 * │ 随便聊   │ 行为层       │  翻旧账 + 戳小尴尬    │ 又来？上次那个呢│
 * │ 讲道理   │ 证据层       │  逼名单 + 敢沉默      │ 名单给我，不是问卷│
 * │ 扇巴掌   │ 动机层       │  揭逃避 + 说白了      │ 说白了，你不是在做│
 * └─────────┴─────────────┴──────────────────────┴─────────────────┘
 *
 * 递进不在"语气强弱"，在**探照灯的深度**：
 *   随便聊照他做过啥，讲道理照他拿不出证据，扇巴掌照他不敢承认的动机。
 */
export const MODE_META: Record<ModeId, ModeMeta> = {
  casual: {
    id: "casual",
    label: "随便聊",
    subtitle: "又来？上次那个呢？",
    description:
      "嫌弃小妹 · 翻旧账戳尴尬——上次的 idea 没了？你自己都记不住？她替你记着。",
    dotColor: "bg-xx-purple",
    activeBorder: "border-xx-purple",
    activeBg: "bg-xx-purple/15",
    glowClass: "mode-glow-casual",
  },
  rational: {
    id: "rational",
    label: "讲道理",
    subtitle: "名单。不是问卷，是名单。",
    description:
      "御姐审讯 · 逼实锤数据——不列 1/2/3，不给结构，不给建议。她问完就停，让沉默替她说话。",
    dotColor: "bg-xx-gold",
    activeBorder: "border-xx-gold",
    activeBg: "bg-xx-gold/10",
    glowClass: "mode-glow-rational",
  },
  scathing: {
    id: "scathing",
    label: "扇巴掌",
    subtitle: "说白了，你不是在做产品。",
    description:
      "精准掀底 · 揭逃避揭动机——她说出你没敢承认的那件事：你在用「创业」给自己开假条。",
    dotColor: "bg-xx-red",
    activeBorder: "border-xx-red",
    activeBg: "bg-xx-red/15",
    glowClass: "mode-glow-scathing",
  },
};
