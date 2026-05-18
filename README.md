# 醒醒 · xingxing.starfluxes.com

> **姐替你把想法熬一遍。**
>
> 一个有人格的 AI 对话产品。御姐风、三档语气、12 问诊断框架，把你模糊的想法熬成一份可以拍下来的 BP。

[![Live](https://img.shields.io/badge/Live-xingxing.starfluxes.com-d4af7a)](https://xingxing.starfluxes.com)
[![Version](https://img.shields.io/badge/Version-1.0.0-rose)](CHANGELOG.md)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org)
[![DeepSeek](https://img.shields.io/badge/AI-DeepSeek-blue)](https://deepseek.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> 🌹 **2026-05-18 · v1.0.0 上线**——告别 0.7.x 内测期，进入弹性维护期。
> 9 天 35+ 版迭代，醒醒终于从「Loading in Progress」走到了第一个能挂在简历上的成品。

---

## 你来这干嘛？给三种人看的「使用说明」

### 🌿 你是「想看姐怎么聊」的路人

直接打开 → [xingxing.starfluxes.com](https://xingxing.starfluxes.com)

1. 在三档里挑一个**今天心情多狠**：
   - 想法刚冒头 → 选 **随便聊**（姐温柔但不哄你）
   - 想被认真拆解 → 选 **讲道理**（姐像合伙人给路径）
   - 已经自我感动需要清醒 → 选 **扇巴掌**（姐像老板附体）
2. 把你的想法/idea/困惑直接打字丢进去（一句话也行，长文也行）
3. 聊够 6 轮 + 姐摸到 4 个关键点后，顶部「**出诊断书**」按钮亮起
4. 点出诊断书 → 30 秒生成一份 PART 1/2/3 完整 BP → 可保存长图分享

### ❄️ 你是「想知道这怎么做出来」的开发者

往下翻看「2. 功能矩阵」「3. 技术架构」「9. 部署 SOP」三节。一句话总结：
- Next.js 14 App Router + DeepSeek SSE 流式
- 自建 Upstash KV 数据面板（替代 Vercel Pro 付费墙）
- 私藏 mind repo 护城河（核心方法论 private 不开源）
- 全站 CSP + 限流双维 + SVG 统一审美

### 🔥 你是「未来的我自己」防遗忘

往下翻看「1. 人设」「11. 不可触碰铁律」「12. 复盘档案」三节。
**每次想动手前，先翻这一份**——尤其是铁律段，是 19 条用踩坑换来的提醒。

---

## 0. TL;DR · 一段看完

| 维度 | 内容 |
|---|---|
| **是什么** | 御姐人格 AI 对话产品。打工人/创业者把模糊想法丢给"醒醒姐"，三档语气把你怼/熬/拆清楚。 |
| **谁在用** | 想做副业的打工人 · 想验证 idea 的产品人 · 自我感动的早期创业者 |
| **核心价值** | ① 不哄你（别的 AI 都太顺毛） ② 12 问框架（不是闲聊，是结构化拆解） ③ 一份"诊断书"BP（聊够 6 轮可生成 · 不达标弹窗追问） |
| **当前版本** | **v1.0.0**（2026-05-18）🌹 第一个真正成品 · 进入弹性维护期 |
| **下一阶段** | 真机黄金路径 + 1 个月数据观察期 · 然后决定 v1.1 / v2.0 路线 |
| **品牌护城河** | 私藏的「**醒醒方法论矩阵**」（独立 private repo，open-source 主仓库不含） |

---

## 1. 人设 · "醒醒姐"是谁

> 这是这个产品的**灵魂**，所有 prompt / UI / 文案 / 视觉都为人设服务。改东西前先回这一节看一眼。

### 1.1 核心人设

**姐姐 · 不是闺蜜，不是顾问，不是教练。**

- **不哄你**：不会说"你说得对"、"你已经很棒了"、"加油"。她会说"醒醒"。
- **有温度**：怼是为了你好，不是嘲讽。怼完会留半句台阶，但绝不替你喊疼。
- **见过事**：不靠 AI 范的"行业洞察"装大佬。靠真实的人间观察、一针见血的反问、突然一句金句把你按醒。
- **三档可调**：你能选她"今天心情多狠"——随便聊 / 讲道理 / 扇巴掌。

### 1.2 三档人格

| 档位 | 适用心态 | 风格关键词 | 配色 |
|---|---|---|---|
| **随便聊** | 想法刚冒头 · 想被温柔看一眼 | 行业百事通视角 · 嫌弃但宠溺 · 留情面但不留幻觉 | 玫瑰金（暖橙系） |
| **讲道理** | 想被认真审视 · 拆假设给路径 | 资深合伙人视角 · 结构化 · 最低验证路径 | 银白冷灰 |
| **扇巴掌** | 已经自我感动 · 需要立刻清醒 | 直觉怪兽视角 · 反问轰炸 · 通俗类比 · 金句斩首 | 暗红血色 |

每档独立的 System Prompt + 不同字色家族 + 同一张脸不同姿态的人物剪影。

### 1.3 写作风格 DNA（混搭来源）

| 来源 | 给醒醒的部分 |
|---|---|
| **王小波** | 极简口语 · 冷幽默 · "正话反说"反讽 · 荒诞逻辑链 |
| **廖一梅** | 短句独白 · 情绪微小捕捉 · 拒绝鸡汤的孤独感 |
| **半佛仙人** | 共情入场→瞬间反转 · "说白了"翻译器 · 排比脱口秀节奏 |
| **toxic-pm** | "怼一切"原型骨架（但醒醒比它有温度） |

### 1.4 v1.0 完整闭环（用户旅程）

```
用户进入主页
    ↓
选三档之一 → 输入想法（一句话/长文都行）
    ↓
醒醒流式回复（每轮挥 1 把刀，攻 12 问中的某一题）
    ↓
聊够 6 轮 + 覆盖 4 题以上
    ↓
点「出诊断书」→ Q 账本判定够格 → 生成 PART 1/2/3 报告 → 跳诊断书页 → 长图分享
    ↓
（不够格分支）
点「出诊断书」→ 弹窗内嵌追问表单 → 用户填答 / 不填都行
    ↓
答完一键出 BP（report.forced=true 加「未充分会诊」金色水印）
```

---

## 2. 功能矩阵 · 醒醒能做什么

### 2.1 已上线（v0.7.11.2 实况）

| 功能 | 描述 | 入口 |
|---|---|---|
| **三档对话** | 流式 SSE · 随便聊/讲道理/扇巴掌一键切换 | 首页气泡区 |
| **12 问诊断框架** | 商业逻辑 4 问 · 产品落地 4 问 · 创始人体检 4 问 | 后台 prompt 注入 |
| **醒醒诊断书 BP** | 聊够 4 轮可一键生成 · 4 件套（封面+三章+裁决+盖章句）| Header「出诊断书」按钮 |
| **诊断书保存长图** | 浏览器内 html2canvas 拍图 · 手机端 4 项体验优化 | 诊断书页 Header |
| **诊断书 90 天可分享** | KV 持久化 · `/diagnosis/{id}` 短链可发朋友圈 | 自动生成 |
| **主页运营数据** | 实时 UV / 累计轮数 / 在线人数 / **锤出 X 份 BP** | 首页 StatsBanner |
| **三档人格分布** | hover ▾ 看真实用户三档使用占比 | 主页右上角 |
| **会话持久化** | localStorage · 7 天 TTL · 50 条上限 | 自动 |
| **后台数据面板** | 4 层鉴权 · 自建 KV 替代 Vercel Pro 付费墙 | `/admin` |
| **OG 分享卡** | @vercel/og 动态生成 · 三档差异化 · 微信引导 | 自动 |
| **限流安全** | IP 30/h · sid 200/d · CSP/X-Frame-Options 等 5 条响应头 | 全站 |

### 2.2 远期（ROADMAP）

- **v0.8.x · PRD 模式** — 12 格拼图引擎 · 模板 A · ¥0.99 cookie 模式（远期价格锚，MVP 先免费）
- **v0.9.x · 小步迭代** — 数据驱动调 prompt / 调 UI
- **v2.0 · 综合升级** — 完整诊断书 UI · 用户系统 · 付费墙完整版
- **v2.0 后** — 自换域名 → 小红书冷启 → 公众号复盘文章

---

## 3. 技术架构 · 一图看完

```
                    ┌─────────────────────────────────────┐
                    │         浏览器（Next.js 客户端）       │
                    │   Chat / ModeSelector / DiagnosisCard  │
                    └─────────────────────────────────────┘
                          │           │           │
                  SSE 流式│      诊断书POST│        │ 60s 轮询
                          ▼           ▼           ▼
        ┌──────────────────────────────────────────────────────┐
        │                Next.js 14 App Router                   │
        │  ┌──────────────┐  ┌──────────────────┐  ┌──────────┐ │
        │  │/api/chat/    │  │/api/diagnosis/   │  │/api/stats│ │
        │  │stream (Edge) │  │generate (Node)   │  │/summary  │ │
        │  └──────────────┘  └──────────────────┘  └──────────┘ │
        │     │                       │                   │      │
        │     │ 系统 prompt 注入        │  KV 写诊断书+计数  │ KV读  │
        │     ▼                       ▼                   ▼      │
        │  ┌─────────────┐    ┌──────────────────────────────┐   │
        │  │lib/prompts/ │    │      Upstash Redis (KV)        │   │
        │  │（含私藏      │    │  · diagnosis:{id} (90d TTL)    │   │
        │  │  方法论矩阵）│    │  · stats:total:bp_count        │   │
        │  └─────────────┘    │  · stats:total:rounds          │   │
        │     │                │  · online:sessions:* (TTL 120s)│   │
        │     ▼                │  · stats:visitors:set (UV)     │   │
        │  ┌─────────────┐    └──────────────────────────────┘   │
        │  │ DeepSeek API │                                         │
        │  │  (流式 SSE)  │                                         │
        │  └─────────────┘                                         │
        └──────────────────────────────────────────────────────┘
                              │
                       Vercel Hobby（自动部署 main 分支）
                              │
                  xingxing.starfluxes.com（Cloudflare CDN 橙云）
```

### 3.1 技术栈选型与理由

| 层 | 选型 | 选它的理由 |
|---|---|---|
| 框架 | **Next.js 14 App Router** | SSE 流式 / Edge runtime / OG 图 satori / @vercel/og 全家桶 |
| 语言 | **TypeScript** | 严格 tsc · 杜绝运行时 undefined |
| 样式 | **Tailwind + 自定义 CSS Variables** | 暗夜玫瑰主题色集中管理（`xx-rose` / `xx-bg` 等命名空间）|
| AI | **DeepSeek API** | 中文输出极强 · 价格 1/10 OpenAI · 流式 SSE 兼容 |
| KV | **Upstash Redis** | Vercel 官方集成 · Edge runtime 兼容 · 免费层够 MVP |
| TTS（可选） | **ElevenLabs / 火山** | 御姐音色（默认关闭，等增长再开）|
| 截图 | **html2canvas** | 浏览器端拍诊断书长图 · 0 后端成本 |
| 部署 | **Vercel Hobby** | 0 成本 + GitHub push 自动部署 |
| CDN | **Cloudflare 橙云** | 解决国内访问 Vercel 不稳 |
| 域名 | **starfluxes.com（阿里云万网）** | 主域留个人主页 · 项目用子域 |

### 3.2 关键设计决策

| 决策 | 为什么 |
|---|---|
| **三档独立 System Prompt** | 人格断层比"调温度"更稳 · 切档=换灵魂 |
| **12 问框架不是 UI 是 prompt** | 用户不需要看到表单 · 姐姐脑子里有这盘棋就行 |
| **诊断书 LLM 生成 + KV 90 天 TTL** | 不做用户系统 · 短链分享 · 90 天足够二次回看 |
| **统计走 KV 不走第三方** | 自己掌控数据 · 替代 Vercel Pro 付费墙 |
| **私藏方法论 separate repo** | 主仓库可开源 · 方法论是护城河 · symlink + 构建期拉取 |
| **emoji → SVG（v0.7.11.2）** | emoji 是 ChatGPT 输出污染的标志 · 全 SVG 拉一档高级感 |
| **冷启文案兜底** | 数字 < 30 时切"刚开张"文案 · 不假装繁荣 |

---

## 4. 视觉系统 · 暗夜玫瑰

### 4.1 配色

```
xx-bg            #14101a   紫黑底
xx-bg-2          #1d1726
xx-purple-deep   深紫
xx-rose          #e8b4b8   玫瑰金（重点色）
xx-rose-deep     #c98a8e
xx-gold          #d4af7a   暖金（数字 / 强调）
xx-text          #f0e8e8   米白正文
xx-text-mid      米色（次级）
xx-red-deep      暗红血色（扇巴掌档）
emerald-400      绿色（已聊透状态）
amber-400        琥珀（半聊到状态）
```

### 4.2 字体

```
font-display     Manrope / Inter Tight     数字+UI（Logo「醒醒」）
font-serif       Noto Serif SC + Songti SC 标题
font-quote       Cormorant Garamond + LXGW WenKai Screen 金句斜体
font-sans        PingFang SC               正文中文
font-mono        ui-monospace              Q1/Q2 编号
```

### 4.3 图标系统（v0.7.11.2 后铁律）

> **禁用 emoji**，全部 inline SVG。

```tsx
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
     strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  ...
</svg>
```

已收敛的图标库（`components/diagnosis/DiagnosisCard.tsx`）：

| 图标 | 用处 |
|---|---|
| `IconBarChart` 柱状图 | PART 1 商业逻辑层 |
| `IconWrench` 扳手 | PART 2 产品落地层 |
| `IconCompass` 罗盘 | PART 3 创始人体检层 |
| `IconGavel` 法槌 | 醒醒裁决书 |
| `IconStamp` 印章 | KILL 盖章句 |
| `IconHourglass` 沙漏 | 封面装饰 + 时间感锚点 |
| `IconTarget` 靶心 | 下次聊建议 |

状态徽章（`components/diagnosis/StatusChip.tsx`）：
- `<StatusChip status="fully" />` 已聊透（emerald 圆点+胶囊）
- `<StatusChip status="half" />` 半聊到（amber 圆点+胶囊）
- `<StatusChip status="none" />` 没聊（red-deep 圆点+胶囊）

---

## 5. 项目结构

```
xingxing-ink/
├── app/
│   ├── api/
│   │   ├── chat/stream/         SSE 流式对话（Edge）
│   │   ├── diagnosis/generate/  诊断书生成（Node 30s）
│   │   ├── stats/summary        主页统计（Edge cache 60s）
│   │   ├── stats/track          埋点
│   │   ├── stats/admin          后台数据面板
│   │   ├── tts                  ElevenLabs / 火山
│   │   └── og                   @vercel/og 动态卡片
│   ├── diagnosis/[id]/          诊断书展示页（KV 读取）
│   ├── diagnosis/demo/          离线 demo 页（无需登录）
│   ├── admin/                   后台 4 层鉴权
│   ├── HomeClient.tsx           主页客户端壳
│   └── page.tsx                 SSR 主页
│
├── components/
│   ├── Chat.tsx                 对话核心 + 双幕布局
│   ├── ChatShell.tsx            状态容器
│   ├── ModeSelector.tsx         三档切换
│   ├── MessageBubble.tsx        消息气泡 + Markdown
│   ├── SilhouetteBackdrop.tsx   人物剪影背景
│   ├── StatsBanner.tsx          首页运营数据条 ⭐
│   ├── ShareButton.tsx          分享 + 二维码
│   ├── ScreenshotToolbar.tsx    诊断书工具栏
│   └── diagnosis/
│       ├── DiagnosisCard.tsx    诊断书四件套渲染 ⭐
│       └── StatusChip.tsx       彩色徽章（v0.7.11.2 新增）
│
├── lib/
│   ├── prompts/
│   │   ├── casual.md            随便聊 SP
│   │   ├── rational.md          讲道理 SP
│   │   ├── scathing.md          扇巴掌 SP
│   │   ├── _methodology/        ⭐ symlink → xingxing-ink-mind（私藏方法论矩阵）
│   │   ├── arsenal_addon/       ⭐ symlink → xingxing-ink-mind（弹药库）
│   │   └── index.ts             prompt 注入逻辑
│   ├── diagnosis/
│   │   ├── generator.ts         LLM 生成诊断书核心
│   │   └── types.ts             DiagnosisReport 类型 + 12 问名表
│   ├── stats/
│   │   ├── kv.ts                Upstash 客户端
│   │   └── keys.ts              ⭐ 所有 KV key 收口（含 BP 计数）
│   ├── security/
│   │   ├── rate-limit.ts        Chat 限流
│   │   ├── diagnosis-rate-limit 诊断书限流
│   │   └── admin-auth.ts        后台 4 层鉴权
│   ├── deepseek.ts              DeepSeek 客户端封装
│   └── session.ts               会话管理
│
├── public/silhouettes/          三档人物 PNG（rembg 抠图）
├── scripts/
│   ├── fetch-mind-repo.sh       构建期拉私藏 repo
│   └── _v078_health.mjs         健康检查
├── _research/                   产品研究/数据/对照实验
├── CHANGELOG.md                 ⭐ 完整版本史（详尽）
├── ROADMAP.md                   ⭐ 路线图
├── DEPLOY.md                    部署说明
└── README.md                    本文件
```

> ⭐ = 设计密度高 / 改之前先看 / 容易踩坑

---

## 6. 数据流与统计

### 6.1 KV 命名约定（`lib/stats/keys.ts`）

```
stats:total:*               累计计数器（终生累加）
  - sessions / rounds / presets / followups / errors
  - bp_count   ← v0.7.11.2 新增：累计锤出诊断书份数
  - intro_played / intro_skipped / cleared

stats:visitors:set          UV 去重 set（SADD/SCARD）

stats:mode:{casual|rational|scathing}    三档分布累计

stats:max:rounds_per_session             单次最长轮数

stats:daily:{YYYY-MM-DD}:*               每日快照
  - visitors / sessions / rounds / errors / followups / mode:{x}
  - bp_count   ← v0.7.11.2 新增

online:sessions:{sessionId}              实时在线（TTL 120s · 30s 心跳）

diagnosis:{reportId}                     诊断书内容（90d TTL）
```

### 6.2 主页 StatsBanner 文案逻辑

```
冷启（totalRounds < 30）：
  「醒醒刚开张几天 · 已陪 N 位朋友醒过来」
  「· 此刻还有 M 人在桌上 ·」

正常：
  「醒醒已陪 N 位朋友 · 捶过 X 轮 [· 锤出 Y 份 BP] ▾」
  「· 此刻还有 M 人正在被骂醒 ·」

▾ 悬浮显示三档分布。
「锤出 Y 份 BP」仅 Y > 0 时显示，避免显示「锤出 0 份」尴尬。
```

---

## 7. 私藏方法论矩阵（护城河）

```
GitHub 主仓库 xingxing-ink (open-source)
    │
    │ 构建期 scripts/fetch-mind-repo.sh
    │ 用 MIND_REPO_TOKEN (PAT) 克隆
    ▼
GitHub 私藏 xingxing-ink-mind (private) 
    │
    ├─ _methodology/   核心方法论矩阵
    └─ arsenal_addon/  弹药库
    │
    │ symlink 进 lib/prompts/
    ▼
build-time 注入 system prompt
```

**铁律**：
- 主仓库 `.gitignore` 排除两个 symlink，绝不进开源
- Vercel 必须配 `MIND_REPO_TOKEN` 环境变量
- 没配就走 fallback（v0.7.7 行为）

---

## 8. 本地开发

### 8.1 5 分钟跑起来

```bash
git clone https://github.com/mansonli001/xingxing-ink.git
cd xingxing-ink
cp .env.example .env.local
```

`.env.local` 至少填：

```bash
DEEPSEEK_API_KEY=sk-xxx                           # 必填
KV_REST_API_URL=https://xxx.upstash.io            # 选填（无则走 in-memory fallback）
KV_REST_API_TOKEN=xxx                             # 选填
```

```bash
npm install
npm run dev
```

打开 http://localhost:3000

### 8.2 完整方法论矩阵开发

需要私藏 repo 访问权限：

```bash
# 同级目录 clone 私藏 repo（仅限维护者）
cd ..
git clone git@github.com:mansonli001/xingxing-ink-mind.git
cd xingxing-ink

# symlink 已在 .gitignore，不会进版本控制
ln -s ../../../xingxing-ink-mind/_methodology lib/prompts/_methodology
ln -s ../../../xingxing-ink-mind/arsenal_addon lib/prompts/arsenal_addon
```

### 8.3 全部环境变量

| Key | 必填 | 默认 | 说明 |
|---|---|---|---|
| `DEEPSEEK_API_KEY` | ✅ | — | DeepSeek 控制台生成 |
| `DEEPSEEK_BASE_URL` | — | `https://api.deepseek.com` | 一般不动 |
| `DEEPSEEK_MODEL` | — | `deepseek-chat` | |
| `KV_REST_API_URL` | 推荐 | — | Upstash REST URL |
| `KV_REST_API_TOKEN` | 推荐 | — | Upstash REST Token |
| `MIND_REPO_TOKEN` | 维护者 | — | GitHub PAT(repo) 拉私藏方法论 |
| `NEXT_PUBLIC_TTS_ENABLED` | — | `false` | TTS 总开关 |
| `ELEVEN_API_KEY` | TTS | — | ElevenLabs Key |
| `ELEVEN_VOICE_ID` | TTS | — | 御姐音色 ID |
| `ADMIN_TOKEN` | 后台 | — | `/admin` 4 层鉴权之一 |

---

## 9. 部署

### 9.1 Vercel（生产）

详见 [DEPLOY.md](./DEPLOY.md)。简版：

1. Fork → push GitHub
2. Vercel → New Project → 选仓库
3. 配环境变量（最低 `DEEPSEEK_API_KEY` · 推荐加 KV）
4. Deploy

### 9.2 域名（已绑定）

- 主域 `starfluxes.com` → 留个人主页（不被任何项目占用）
- 子域 `xingxing.starfluxes.com` → 醒醒（已上线）
- DNS：阿里云万网注册 → Cloudflare 托管 → 橙云代理
- Vercel Domains 配 `xingxing.starfluxes.com` 不勾 redirect to www

---

## 10. 版本史（精炼版 · 完整版见 CHANGELOG）

> 三个月 35+ 个版本，太长不看版：

```
v0.1     · 三档人格 + 流式对话 MVP
v0.2~0.6 · 视觉/字体/人设/双幕迭代
v0.7.0   · 反套路化（不哄你 · 真姐姐感）
v0.7.8   · ⭐ 醒醒方法论矩阵 v1.0（私藏 repo 上线）
v0.7.9   · 12 问动态 picker · token -17%
v0.7.9.2 · ⭐ 自建 KV 数据面板（替代 Vercel Pro 付费墙）
v0.7.9.3 · 会话 localStorage 持久化（7d / 50 条）
v0.7.9.5 · UX 视觉地基（三档主题色 + 气泡重构）
v0.7.9.6 · 抽屉框架 + 12 问隐喻进度
v0.7.9.7 · 上线体面（OG 图 + SSR + 微信引导）
v0.7.9.7.x · OG 字体 / 弹窗 / ShareButton 多次修复
v0.7.9.7.8 · 安全 P0（限流 + CSP/X-Frame 等 5 头）
v0.7.9.8~10 · 诊断书展示页 + Header 重构 + 离线 demo
v0.7.11    · ⭐ 诊断书全链路打通（LLM 生成 + KV 持久化）
v0.7.11.1  · 诊断书手机长图 4 项体验优化
v0.7.11.2  · 主页加「锤出 X 份 BP」+ 诊断书全面去 emoji
v0.7.12.0  · ⭐ Q 账本地基 + BP 门槛升级 + 外部评测漏洞修复（当前）
```

### 当前版本 v0.7.12.0 详情（2026-05-15）

**Added · Q 账本地基（外部评测意见 #11/#14 救命）**
- `lib/diagnosis/q-ledger.ts` 新建：纯函数账本核心（hasUserFact / makeEmptyLedger / mergeIncrement / computeNewlyFullyCovered / loadLedger / saveLedger）
- `lib/diagnosis/q-ledger-judge.ts` 新建：fire-and-forget 轻量判官 LLM（deepseek-chat / temp=0.2 / max_tokens=300 / json_object）
- `lib/diagnosis/bp-gate.ts` 新建：BP 生成门槛（≥6 轮 + 有效覆盖≥4）
- KV `session:{id}:ledger` TTL 90 天 + 全站累计 `stats:total:q_fully_covered`
- `app/api/chat/stream/route.ts` 流式回复 done 后 fire-and-forget 触发判官
- 性能兜底：用户消息无 hasUserFact 时跳过判官（防虚高 + 省钱）

**Changed · 救命修复（外部评测吸收）**
- BP 生成门槛 ≥2 轮 → ≥6 轮 + 有效覆盖≥4（防空洞 BP 伤口碑 · 评测意见 #10）
- generator.ts 新增 prefilledLedger 入参，注入账本作"参考事实"减少 LLM 幻觉
- diagnosis/generate API 限流后追加 BP 门槛闸，不达标返 422 + friendly error

**Added · 用户感知**
- StatsBanner 在线行下方加新一小行「12 题里聊透 X 题」（仅 >0 且非冷启时显示）
- ChatProgressHint 第 3/6/9 轮触发顶部一行 toast（不露 Q 编号 · 6 秒淡出）

**Fixed · 外部评测漏洞修复**
- emoji 漏修：`app/diagnosis/[id]/page.tsx` + `demo/page.tsx` 页头 ⏰ → IconHourglass SVG
- emoji 漏修：`DiagnosisToolbar.tsx` 三档 🌿❄️🔥 → IconLeaf/IconSnow/IconFlame SVG
- emoji 漏修：`lib/diagnosis/demo.ts` 正文 ✅⚠️❌ → 纯文字标签
- OG `Cache-Control` 1h → 24h + stale-while-revalidate=7d（OG 6.5s 慢修复）
- `package.json` version 0.1.0 → 0.7.12.0（与 SemVer 叙事对齐）
- `ROADMAP.md` 同步到 v0.7.12.0 + 近月三大重点

**Cost / Performance**
- 判官调用 ~300ms（fire-and-forget 用户感知不到）
- 判官成本 ~$0.0001/轮 · 1000 轮约 ¥0.7
- 首页体积 +0.3KB（StatsBanner 小行 + AnimatedNumber 复用）
- 主对话流式链路 0 影响（双链路解耦）

**Quality Gate · 4 commit 推送**
- commit 1/4 数据层：`0783486` · 类型 + 4 模块（586 insertions）
- commit 2/4 聊天层：`5b63f06` · fire-and-forget + 门槛 + 吃账本（192 insertions）
- commit 3/4 闭环层：`b7d96ec` · summary API + 小行 + Chat 提示 + OG cache（187 insertions）
- commit 4/4 修缮层：本次提交
- tsc 0 error / 0 lint / next build 通过 / 0 主链路回归
- `app/api/diagnosis/generate` KV 写诊断书成功后 incr 累计 + 当日（自动续 TTL）
- `app/api/stats/summary` 返回字段新增 `totalBpCount`
- `components/StatsBanner.tsx` 大行追加「· 锤出 X 份 BP」（仅 >0 时显示）

**Changed · 诊断书全面去 emoji（用户反馈"太 AI 太 low"）**
- 新建 `components/diagnosis/StatusChip.tsx` — 方案 C 彩色徽章
- ✅⚠️❌ 三档状态 → StatusChip
- 📊 PART 1 / 🛠️ PART 2 / 🧠 PART 3 → IconBarChart / IconWrench / IconCompass
- 📊 醒醒裁决书 → IconGavel 法槌
- 🗡️ KILL 盖章句 → IconStamp 印章
- ⏰ 封面装饰 → IconHourglass 沙漏
- 🎯 下次聊建议 → IconTarget 靶心
- 全部 SVG：24×24 / stroke=1.5 / currentColor / aria-hidden

**质量门禁**
- tsc 0 错 / 0 lint / next build ✓
- 首页体积 71.0 → 71.1 KB（+0.1 KB）
- 0 回归

---

## 11. 路线图（精炼版 · 完整版见 ROADMAP）

```
v1.0.0 当前 🌹 ──────────────┐
                            │ (弹性维护期)
                            ▼
近月 P0 三件事：
  ① 前端 UX 优化（最高优先级）
  ② 扩展 PRD 等付费功能（商业化探索）
  ③ Debug（真机使用问题）
                            │
                            ▼ 小步快跑（每个 patch ≤4h）
v0.7.11.x · v0.7.12 · v0.7.13 ...
                            │
                            ▼
v0.8.x · PRD 模式（12 格拼图引擎 + 模板 A · MVP 不收费）
                            │
                            ▼
v0.9.x · 数据驱动小迭代
                            │
                            ▼
v2.0 · 综合升级（完整诊断书 UI + 用户系统 + 付费墙）
                            │
                            ▼
v2.0 后 · 自换域名 → 小红书冷启 → 公众号复盘文章
```

**明确推迟**（避免分心）：
- ❌ 写公众号复盘文章 — 至少 1 个月后
- ❌ 战略 3：方法论 RAG — 矩阵超 15K tokens 时再做
- ❌ 自换域名 — V2.0 后

---

## 12. 灵感来源 & 致谢

- **王小波 / 廖一梅 / 半佛仙人** — 三档人格语气来源
- **toxic-pm.bijin.ink** — "怼一切"原型骨架
- **「李一桐姐姐替你看穿一切」** — 视觉锚定
- **DeepSeek** — 中文 LLM 救命恩人（价格 = OpenAI 的 1/10）
- **Upstash + Vercel** — Hobby 免费层撑起整个 MVP

---

## License

**MIT** — 拿去随便用，但不要拿去骗朋友说是你做的。

---

**Loading in Progress……**

> 「醒醒——你那不是想法，是没醒。」  
> by [@mansonli001](https://github.com/mansonli001) · 维护者 · "Cyber Loading"
