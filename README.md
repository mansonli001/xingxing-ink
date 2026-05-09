# 醒醒 · xingxing.ink

> **姐替你把想法熬一遍**
>
> 御姐风格的 AI 对话产品。三档人格，把你模糊的想法熬成清楚的判断。

[![Live](https://img.shields.io/badge/Live-xingxing.ink-d4af7a)](https://xingxing.ink)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![DeepSeek](https://img.shields.io/badge/AI-DeepSeek-blue)](https://deepseek.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 这是什么

打工人的副业、产品经理的 PRD、创业者的 Pitch、甚至深夜辞职冲动——
这些**模糊的想法**，丢给一个温柔但不哄你的姐姐，让她替你**熬一遍**。

熬完你会发现：
- 有些想法是**真有东西**，姐替你拆出来怎么落地
- 有些想法是**自我感动**，姐让你看清自己在哪儿做梦
- 有些问题是**问错了**，姐换个角度重新问你一遍

## 三档人格

| 档位 | 适合 | 风格 |
|---|---|---|
| **随便聊** | 想法还没成型 | 像姐姐看你长大，温和直率，留情面但不留幻觉 |
| **讲道理** | 想被认真审视 | 像咨询顾问，结构化拆假设、给最低验证路径 |
| **扇巴掌** | 已经自我感动 | 像被你老板附体，反问轰炸 + 通俗类比 + 金句斩首 |

每档人格独立的 System Prompt + 不同的字色家族 + 同一张脸不同姿态的人物剪影。

## 视觉

- **配色**：暗紫底 + 玫瑰金重点 + 米色家族正文
- **字体**：霞鹜文楷 Screen（楷体手写感）+ Noto Serif SC（标题宋体）
- **构图**：左右双幕——首页居中迎宾，对话开始气泡左对齐让出右侧人物
- **人物**：3 张 K-beauty 风格御姐 AI 生成 + rembg 抠图透明 + CSS 哑光底纹化处理

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Next.js 14 App Router + TypeScript |
| 样式 | Tailwind CSS + 自定义 CSS Variables |
| AI | **DeepSeek API**（流式 SSE，纯 Prompt 工程） |
| TTS（可选）| ElevenLabs / 兼容协议 |
| 抠图工具 | rembg `u2net_human_seg` 模型（仅构建期）|
| 部署 | Vercel（Hobby 免费） |

## 项目结构

```
xingxing-ink/
├── app/
│   ├── api/chat/stream/route.ts     SSE 流式对话入口
│   ├── globals.css                  全局样式 + markdown 排版
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── Chat.tsx                     对话核心 + 双幕布局
│   ├── ChatShell.tsx                状态容器
│   ├── ModeSelector.tsx             三档切换
│   ├── MessageBubble.tsx            消息气泡 + Markdown 渲染
│   ├── SilhouetteBackdrop.tsx       人物剪影背景
│   └── modeMeta.ts
├── lib/
│   ├── prompts/
│   │   ├── casual.md                随便聊 System Prompt
│   │   ├── rational.md              讲道理 System Prompt
│   │   ├── scathing.md              扇巴掌 System Prompt
│   │   └── index.ts                 模式元数据 + Prompt 加载
│   ├── deepseek.ts                  DeepSeek 客户端封装
│   └── session.ts                   内存会话管理
└── public/silhouettes/              三档人物 PNG（透明底）
```

## 本地跑起来（5 分钟）

```bash
git clone https://github.com/mansonli001/xingxing-ink.git
cd xingxing-ink
cp .env.example .env.local
```

编辑 `.env.local`，**只需要**填这一项：

```bash
DEEPSEEK_API_KEY=sk-你的DeepSeek-Key
```

DeepSeek Key 在 https://platform.deepseek.com/api_keys 创建。

```bash
npm install
npm run dev
```

打开 http://localhost:3000 — 御姐已经在等你。

## 部署到 Vercel

详见 [DEPLOY.md](./DEPLOY.md)。

简版：
1. Fork / push 到 GitHub
2. Vercel → New Project → 选仓库
3. Environment Variables 配 `DEEPSEEK_API_KEY`
4. Deploy

## 环境变量

| Key | 必填 | 默认值 | 说明 |
|---|---|---|---|
| `DEEPSEEK_API_KEY` | ✅ | — | DeepSeek 控制台生成 |
| `DEEPSEEK_BASE_URL` | — | `https://api.deepseek.com` | 一般不用改 |
| `DEEPSEEK_MODEL` | — | `deepseek-chat` | 默认即可 |
| `NEXT_PUBLIC_TTS_ENABLED` | — | `false` | 语音总开关 |
| `ELEVEN_API_KEY` | TTS 用 | — | ElevenLabs Key |
| `ELEVEN_VOICE_ID` | TTS 用 | — | 御姐音色 ID |
| `TTS_MAX_CHARS` | — | `500` | 单次 TTS 长度上限 |

## 灵感来源

- 「李一桐姐姐替你看穿一切」式的视觉锚定
- 王小波 / 廖一梅 / 半佛仙人三档语气混搭
- toxic-pm 的"怼一切"原型 + 醒醒的"温度"再造

## 路线图

- [x] 三档人格 + 流式对话 MVP
- [x] 人物剪影 + 双幕布局 + 米色字体系统
- [ ] 部署到 xingxing.ink
- [ ] ElevenLabs 御姐语音
- [ ] 持久化会话（Supabase）
- [ ] PRD 文档解析模式
- [ ] 公众号引流落地页

## License

MIT — 拿去随便用，但不要拿去骗朋友说是你做的。

---

**Loading in Progress……**

<sub>by [@mansonli001](https://github.com/mansonli001) · 「醒醒——你那不是想法，是没醒。」</sub>
