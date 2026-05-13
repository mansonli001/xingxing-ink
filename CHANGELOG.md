# 醒醒 · 更新日志

> 项目：xingxing-ink
> 线上：https://xingxing-ink.vercel.app/
> 维护：mansonli001（Loading in Progress）

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

---

## [v0.7.9.7.2] - 2026-05-13 — 「微信引导重构 + OG 图 v2 紧凑版」

> 用户真机反馈两个 P0：
> 1. 微信顶部红条「丑 + 不应该主动赶用户走」
> 2. OG 图三档符号渲染成 ☒ tofu 方块 + 整体太空难看
>
> 全部推倒重做。

### Bug 1 · 微信引导彻底重构（不再赶用户走）

**反思**：之前设计逻辑 = "微信内体验 < 浏览器 → 引导出去" = 把 70% 流量当 bug。
**新逻辑** = 微信是主战场，体验就该好；只在用户想分享时给二维码。

**Removed**
- `components/WeixinGuide.tsx` · 顶部红条（彻底删除）
- `app/HomeClient.tsx` · 不再渲染顶部引导

**Added**
- `components/ShareButton.tsx` · 输入框右上角小图标（24×24 QR icon · 主题色细线条）
- `components/ShareQRDialog.tsx` · 分享二维码弹窗
  - 标题「扫码分享给朋友」（不再是"在浏览器打开"）
  - 描述「截屏发给朋友，让 ta 也来被姐怼一下」
  - 双按钮：复制链接 + 关闭
  - ESC 键关闭
  - 任何环境都能用（不做 UA 检测）

**Changed**
- `components/Chat.tsx` · 输入框上方右侧挂载 ShareButton（绝对定位，不挤宽度）
- `app/HomeClient.tsx` · header slogan 从「姐替你把想法熬一遍」改为「不哄人，只怼人」+ 0.12em 字距
- `app/globals.css` · 删 `.wx-guide-*` 全部样式 + 加 `.share-btn` / `.share-btn-corner` / `.wx-qr-actions` / `.wx-qr-secondary` 样式 + 修 prefers-reduced-motion 块

### Bug 2 · OG 图 v2 重做

**根因**：
- next/og 默认字体不支持 ❍ ⌖ ✕ Unicode 抽象符号 → 渲染为 tofu ☒
- flex space-between 把元素硬撑开 → 视觉松散
- 引文块只有边框无填充 → 失去盖章感

**修复**：
- 三档抽象符号 → **中文胶囊**「随便聊/讲道理/扇巴掌」
  - 当前档：粗边框（2px）+ 主题色实底渐变 + 字重 700
  - 其他档（无 mode 参数时全亮）：1.5px 边 + 半透明渐变 + 字重 500
  - 灰档（有 mode 参数时其他两档）：opacity 0.4 + 极弱边
- 整体改为**居中堆叠**（main flex column · justify-center），去掉 space-between 撑开
- 引文块改为**实底盖章**：暗血红 0.22→0.08 渐变背景 + 50px outer glow + 30px inset glow
- 主标题字号 220px → **180px**（更紧凑），主题色阴影 24px
- 钩子句字号 56px → **50px** + 0.22em 字距（拉长仪式感）
- 引文字号 52px → **48px** + textShadow 主题色光晕
- 加**底部签名横线**：水平渐变线 + 「Loading in Progress / xingxing.starfluxes.com」一行
- scathing 主色从 #991B1B 改为 **#CC3344**（OG 图上 #991B1B 太黑沉，#CC3344 更醒目）

### 验证

- tsc 0 错 / next build ✓ / 0 lint
- v0795 sanitizer 50/50 + v07955 killabc 23/23（全部 0 回归）
- /og 路由编译为 Edge Runtime ƒ（416KB）

### 待用户验证

1. 硬刷新主页 → 不再有顶部红条
2. 输入框右上角 → 看到二维码小图标
3. 点小图标 → 弹「扫码分享给朋友」
4. 访问 /og + /og?mode=scathing 看新版图（中文胶囊 + 紧凑 + 实底盖章）
5. 微信内打开 → 不再被打扰，体验等同浏览器（除现有 AudioPlayer/MicInput 各自的降级）

### 不影响范围

- ✅ v0.7.9.5/6 全部 0 回归（三档色锁/段落渐入/Toast/抽屉/12 方块/视觉地基/输出仪式三件套）
- ✅ v0.7.9.7 SSR 壳 / HeroFallback 0 改动
- ✅ 现有 MicroMessenger 检测在 AudioPlayer / MicInput / MessageBubble 仍保留（各自降级，不与 ShareButton 冲突）

---

## [v0.7.9.7.1] - 2026-05-13 — 「OG 图重做：@vercel/og 三档动态版 + 钩子升级」

> 用户反馈："OG 图我们是不是要好好设计" —— 原 image_gen + sips 暴力裁切版完全废弃，重做。
>
> 三档动态参数化：`/og` 默认综合版 / `/og?mode=casual|rational|scathing` 三档专属版。

### 钩子文案升级（全站统一）

- 旧 slogan：姐替你把想法熬一遍 → ❌ 已弃用
- **新主钩子**：不哄人，只怼人（玫瑰金 64px）
- **新引文**：你的想法，敢给姐看吗？（白色 56px + 主题色光晕）

### 三档专属金句（用户拍板 A1/B2/C3）

| 档 | 金句 | 颜色 |
|---|---|---|
| casual | 姐不陪你做梦，但陪你说人话 | 粉紫 #D170E8 |
| rational | 姐不评价你的感受，只看你的逻辑 | 玫瑰金 #E8B4B8 |
| scathing | 别哭，姐还没开始扇 | 暗血红 #991B1B |

### Added

- `app/og/route.tsx` · 动态 OG 图生成路由（Edge Runtime · next/og）
  - 三段递进排版：主标 240px「醒醒」+ 钩子 56px「不哄人，只怼人」+ 引文块 + 三档抽象符号
  - 三档抽象符号：❍ 随便聊（粉紫）/ ⌖ 讲道理（玫瑰金）/ ✕ 扇巴掌（暗血红）
  - URL 参数 `mode=casual|rational|scathing` 切档
    - 背景径向光晕换主题色
    - 引文块换对应金句
    - 当前档符号高亮，其他档透明度 30%
  - 默认（无参数）：综合版 = 三档全亮 + 默认引文
  - CDN 缓存 1 小时（s-maxage=3600）

### Changed

- `app/layout.tsx`
  - `title` / `description` 升级钩子文案（不哄人，只怼人 + 你的想法，敢给姐看吗？）
  - `openGraph.images.url` 从 `/og-image.png` 改为 `/og`（动态路由）
  - `twitter.images` 同步改为 `/og`
- `app/HeroFallback.tsx`
  - 副标题从「姐替你把想法熬一遍」改为「不哄人，只怼人」+ 0.18em letter-spacing

### Removed

- `public/og-image.png` · 静态 OG 图（被动态路由替代，0 用户）

### 技术决策

- **0 新依赖**：Next.js 14.2.5 已内置 `next/og`（无需安装 @vercel/og 独立包）
- **Edge Runtime**：OG 路由跑在 Vercel Edge，全球 CDN 节点就近渲染
- **三档抽象符号**：用 ❍ / ⌖ / ✕ 替代 AI 生美女头像（避免廉价感 + 跟现有 SilhouetteBackdrop 不打架）

### 验证

- tsc 0 错 / next build ✓ / 0 lint
- v0795 sanitizer 50/50 PASS（0 回归）
- v07955 killabc 23/23 PASS（0 回归）
- `/og` 路由编译为 Edge Runtime ƒ（416KB route.js）
- 待真机：opengraph.xyz / Twitter Card Validator + 访问 4 个 URL 看 4 张图

### 不影响范围

- ✅ v0.7.9.7 SSR 壳（HeroFallback / HomeClient）保留，仅副标题文案改
- ✅ v0.7.9.7 微信引导（WeixinGuide）0 改动
- ✅ v0.7.9.5/5.5.x / 6 全部 0 回归

### 待用户验证

1. 硬刷新 `https://xingxing.starfluxes.com/og` 看默认综合版
2. 访问 `/og?mode=scathing` 看暗血红专属版
3. opengraph.xyz 抓首页 URL 验证社交平台预览
4. （可选）转发链接到微信文件传输助手看大图卡片

---

## [v0.7.9.7] - 2026-05-13 — 「上线体面 · OG 图 + SSR 壳 + 微信引导条」

> 增长先行（Y 路线）：链接发出去像正经产品。
> 来源：深度审查报告 P0 + 安全审查未涉及 + 外部 plan P0-G1/G2/G3/G4 全部 closure。

### Step 1 · 静态 OG 图

- 新增 `public/og-image.png`（1200×630 PNG · 标准 OpenGraph 尺寸）
- 设计：暗紫黑底 + 「醒醒」金色楷书标题 + slogan + 三档主题色环（粉紫/玫瑰金/暗血红）+ Loading in Progress 签名
- 用 image_gen 生成 1264×848 → 用 macOS sips 缩放裁切到标准 1200×630

### Step 2 · metadata 升级（`app/layout.tsx`）

- 新增 `NEXT_PUBLIC_SITE_URL` 环境变量统一（兜底 `https://xingxing.starfluxes.com`）
- 新增 `metadataBase: new URL(SITE_URL)` —— OG image 等相对路径自动解析为绝对 URL
- 新增 `alternates.canonical: SITE_URL` —— 防爬虫抓到 vercel.app 旧域名
- 修复 `openGraph.url` —— 从 `xingxing-ink.vercel.app` 改为正式域名（深度审查 + 外部 plan 共同发现）
- 新增 `openGraph.images: [{ url, width: 1200, height: 630, alt }]`
- 新增 `twitter: { card: "summary_large_image", images, ... }`（之前只有 `summary` 没图）
- `authors: "Loading in Progress"` 保留（用户决策：这是品牌梗，不删）

### Step 3 · SSR 首屏壳极简版

修复深度审查 P0：「首屏空白闪烁（FOUC）· 整页 BAILOUT_TO_CLIENT_SIDE_RENDERING」

- 新建 `app/HeroFallback.tsx`（Server Component · 0 client 依赖）
  - 居中标题「醒醒」+ slogan + 三档胶囊 + Loading in Progress 标签
  - 暗紫黑底 + 金色 + 玫瑰色，0 闪烁直接 SSR HTML 输出
- 新建 `app/HomeClient.tsx`（拆出原 page.tsx 全部 client 逻辑）
  - hydrate 检测 + sessionStorage 是否播 WakeUpIntro
  - 内置 `<WeixinGuide />` 微信引导
  - hydrate 完成后 `document.body.setAttribute("data-hydrated", "true")`
- 改 `app/page.tsx` 为 Server Component（去掉 "use client"）
  - 同时渲染 `<HeroFallback />` + `<HomeClient />`
  - SSR 阶段 HeroFallback 撑场，hydrate 后 client 接管，HeroFallback 通过 CSS `body[data-hydrated="true"] .hero-fallback` 自动淡出隐藏
- `app/globals.css` 新增 `.hero-fallback / .hero-pill` 样式 + transition 隐藏机制

**SSR 验证**：next build 产物 `.next/server/app/index.html` 含 `hero-fallback` × 2 / `醒醒` × 18 / `三档名称` × 各 8 / `slogan` × 10。**爬虫/禁 JS/慢网络都能看到完整产品名 + 价值主张**。

### Step 4 · 微信内置浏览器引导（A 顶部条 + C 二维码弹窗）

修复深度审查 P0：「微信内置浏览器不兼容 · 70%+ 自然流量流失」

- 新建 `components/WeixinGuide.tsx`
  - **UA 检测**：`navigator.userAgent.includes('micromessenger')`，命中才渲染（SSR 阶段返回 null 避免 hydration mismatch）
  - **A · 顶部引导条**：暗血红渐变背景 + 御姐文案「姐这里在浏览器打开才完整 —— 微信里有点功能跑不动。」+ 三个 CTA：
    - **「浏览器打开」**：toast 教学「点右上角 ··· → 在浏览器中打开」
    - **「复制链接」**：navigator.clipboard 复制当前 URL + toast 反馈
    - **「二维码」**：弹窗显示 QR
  - **C · 二维码弹窗**：居中卡片 + SVG QR（qrserver.com 公开 API · 0 新增依赖）+ URL 文本兜底 + 关闭按钮
  - **0 引入 npm 依赖**（QR 用第三方公开 API，失败时 URL 文本兜底）
- `app/globals.css` 新增 `.wx-guide-bar / .wx-guide-btn / .wx-qr-overlay / .wx-qr-card / .wx-qr-svg / .wx-qr-toast` 完整暗夜玫瑰主题样式

### Added

- `public/og-image.png` (1200×630 standard OG image)
- `app/HeroFallback.tsx` (Server Component · SSR 极简首屏壳)
- `app/HomeClient.tsx` (Client Component · 原 page.tsx client 逻辑拆出)
- `components/WeixinGuide.tsx` (微信引导 A+C · UA 检测渲染)

### Changed

- `app/layout.tsx` - metadata 全套升级（metadataBase + canonical + og:image + twitter:summary_large_image + 域名修正）
- `app/page.tsx` - 改为 Server Component，组合 HeroFallback + HomeClient
- `app/globals.css` - 新增 `.hero-fallback*` SSR 壳样式 + `.wx-guide-*` / `.wx-qr-*` 微信引导完整样式

### 验证

- tsc 0 错 / next build ✓ / 0 lint
- v0795 sanitizer 50/50 PASS（0 回归）
- v07955 killabc 23/23 PASS（0 回归）
- SSR HTML 验证：`.next/server/app/index.html` 含 `hero-fallback` / 「醒醒」/ 三档名 / slogan
- 真机待硬刷新验证 + Twitter Card Validator 检查

### 待用户后续做

1. **设 Vercel 环境变量** `NEXT_PUBLIC_SITE_URL=https://xingxing.starfluxes.com`（兜底已有，但显式设置保险）
2. **Twitter Card Validator** 抓 https://xingxing.starfluxes.com 验证 OG 图正确预览
3. **Facebook Sharing Debugger** 同样验证一次
4. **微信真机测试**：用微信打开链接，看顶部引导条 + 二维码弹窗

### 不影响范围

- ✅ v0.7.9.5.0-5.5.2 全部 0 回归（sanitizer + KILL/ABC + 视觉地基 + 三件套）
- ✅ v0.7.9.6 段落渐入 0 改动
- ✅ WakeUpIntro 开场动画 0 改动
- ✅ ChatShell / Chat / MessageBubble 0 改动
- ✅ 现有 MicroMessenger 检测（AudioPlayer / MicInput / MessageBubble 里的）保留作为各自降级，WeixinGuide 是顶层引导独立工作

### 风险与监控

- **OG 图缓存**：社交平台可能缓存旧 URL，需用各平台 debugger 强制刷新
- **qrserver.com 依赖**：第三方 API 偶发失败时 URL 文本兜底；后续如需 100% 自主可换 npm `qrcode` 库（~30KB）
- **HeroFallback 闪烁**：通过 0.4s opacity 渐隐 + visibility delay 控制，硬刷新真机看一下是否流畅

---

## [v0.7.9.5.5.2] - 2026-05-13 — 「修 Bug 1 · 多轮 ABC + KILL 不衰减」

> 用户真机暴露 Bug 1：第 4 轮开始 ABC 没换行（同行连写）+ 出现 D 选项 + KILL 标记完全漏写。
> 三件套渲染全部失败。
>
> 根因：LLM 多轮上下文衰减，prompt 格式约束被遗忘。
>
> 双层修复：prompt 多轮强化（治本）+ 前端容错放宽（治标，已暴露的失败 case 全部能救回）。

### Bug 1.1 · extractOptions 双策略容错

`components/OptionButtons.tsx` 升级为「先按行扫，失败 fallback 同行连写正则切」：

- **策略 1**：原行首 `^[A-D][.．、]` 扫描（v0.7.9.5.3 兼容性 0 回归）
- **策略 2（新）**：策略 1 命中 < 2 时，把整段折成单行用 lookahead `(^|\s)[A-D][.．、]\s+` 切分
- 支持 ABCD 4 选项（之前只到 ABC）
- 字母连续校验改为 `validateContinuous` 工具函数，A→B→C→D 必须连续

**真机救回 case**：
```
A. 卖会员……比如19.9一个月。 B. 卖广告/带货……佣金。 C. 卖课程……陪伴。 D. 我还没想清楚……
```
→ 4 个选项全部解出 ✅

### Bug 1.2 · extractKillStamp 第四层兜底（金句特征识别）

`components/KillStamp.tsx` 在三层 KILL 标记容错失败后，加第四层"按金句特征兜底"：

判定条件（必须**全部满足**避免误识别）：
1. 末段（按 `\n\n` 切的最后一段）
2. 单行（不含换行）
3. 长度 10-60 字
4. 含至少 1 个金句关键词白名单

金句关键词（17 个）：`死穴` / `真相` / `本质` / `你不是X你是` / `不是Y就行` / `你才是` / `这就是` / `你给的是` / `你以为是` / `生意就得` / `账本` / `醒醒` / `答案` / `钱赚不到` / `路走错了` / `想清楚` / `骗自己`

**真机救回 case**：
```
（…前面 diss…）

A. 选项一……
B. 选项二……

你不是在做一个产品，你是在做一个生意。生意就得有账本，不是有用户就行。
```
→ 末段被识别为 KILL 渲染成「醒醒 ·」盖章卡 ✅

### Bug 1.3 · prompt 多轮对话格式铁律

`lib/prompts/index.ts` 末尾追加「v0.7.9.5.5.2 多轮对话格式铁律」段，强化三条：

1. **ABC/ABCD 选项每个独立成行**（绝不同行连写）— 含 ✅/❌ 对比示例 + 支持 2-4 个选项明确范围
2. **KILL 盖章句永远必须**，不管第几轮、不管多短，结尾必须有 `[KILL]xxx[/KILL]`
3. **KILL 之后绝不能再有任何文字**（盖章后这条回复就结束）

最终自检：
- 我这条回复的最后一行是不是 `[KILL]xxx[/KILL]`？不是 → 重写
- ABC/ABCD 是不是每个独立一行？不是 → 重写
- KILL 标记的 `[KILL]` 和 `[/KILL]` 是不是都写了？没都写 → 重写

### Bug 1.4 · 健康检查脚本

新建 `scripts/_v07955_killabc_health.mjs`（与原 sanitizer 健康脚本独立），共 **6 大类 23 个测试用例全 PASS**：

| Test | 内容 |
|---|---|
| Test 1 | 标准换行格式 ABC（v0.7.9.5.3 兼容性回归 ✅）|
| Test 2 | **同行连写 ABCD 兜底（用户截图真实 case）✅** |
| Test 3 | 边界保护（普通话偶现 A. 不识别 / 不连续不识别 / 过短不识别）|
| Test 4 | KILL 三层容错（v0.7.9.5.3.1 回归）|
| Test 5 | **第四层兜底 · 完全无标记金句特征识别（用户截图 case）✅** |
| Test 6 | 第四层兜底边界保护（ABC 段不识别 / 过长过短不识别 / 无关键词不识别 / 多行不识别）|

### 不影响范围

- ✅ v0.7.9.5.0 sanitizer 50/50 全 PASS（0 回归）
- ✅ v0.7.9.5.1-4 三档色锁/关键词高亮/输出仪式三件套/专业密度铁律 0 改动
- ✅ v0.7.9.5.5.1 模式按钮加强/AI 气泡呼吸感/人影按轮次显形 0 改动
- ✅ MessageBubble 渲染顺序保持「先剥 KILL → 再从剩余正文识别 ABC」（KILL 第四层兜底剥掉金句段后，ABC 段成为新末段被策略 2 命中，闭环完美）

### 验证

- tsc 0 错 / next build ✓ / 0 lint
- v0795 sanitizer 50/50 PASS（0 回归）
- v07955 killabc 23/23 PASS
- 真机待硬刷新验证

### 风险

第四层兜底是「按特征猜」，存在**误识别风险**（理论上某段普通对话末句恰好是短句 + 含 `想清楚` 等关键词会被当 KILL）。已通过 17 词白名单 + 长度 + 单行 + 排除 ABC 段 多重守卫降低风险。如真机出现误判可微调白名单。

---

## [v0.7.9.5.5.1] - 2026-05-13 — 「视觉微调三件套：模式按钮加强 + 气泡呼吸感 + 人影按轮次显形」

> 用户真机反馈三个 P1 视觉问题，30 分钟一波修复。
> 不动逻辑，纯视觉优化，0 风险。

### Bug 2 · 模式按钮选中态加强

- `ModeSelector.tsx` 当前档位 `border` → `border-2`、加 `mode-pill-active mode-pill-active-{id}` 双 class
- 字色字重：`text-white` + `font-semibold tracking-wide`（之前只是 text-white 普通字重）
- 微浮起：`translateY(-1.5px)`（不再贴底）
- 顶部 inner highlight 1px 白线（点亮感）
- 三档差异化 outer glow 加强（之前 28-36px → 现在 32-36px outer + 12-14px inner + inset glow）
  - casual 粉紫光晕加 12px 内层
  - rational 玫瑰金光晕加 12px 内层
  - scathing 暗血红光晕加 14px 内层（最强）
- 未选中档加 `opacity-80` + hover `-translate-y-0.5`，强化"亮的就是当前档"

### Bug 3 · AI 气泡内边距 +4px

- `MessageBubble.tsx` AI 气泡 `px-5 py-4` → `px-6 py-5`
- 左右上下各 +4px，视觉呼吸感更强不贴边

### Bug 4 · 人影按 turnCount 渐进显形

- `SilhouetteBackdrop.tsx` 新增 `turnCount?: number` prop
- 新增两个计算函数：
  - `calcSilhouetteOpacity`：第 0 轮 0.16 → 第 8+ 轮 0.58（线性递增，max 0.58 保留剪影感）
  - `calcSilhouetteBlur`：第 0 轮 8px → 第 8+ 轮 1px（线性递减）
- 通过 inline style 注入 CSS 自定义属性 `--silhouette-opacity` / `--silhouette-blur`
- `globals.css` 把所有 `.silhouette-img[data-active="true"]` 的 opacity / filter:blur 改为 var() 引用
- 1.5s `cubic-bezier(0.22, 1, 0.36, 1)` 平滑过渡（不闪不跳）
- 桌面/手机/平板三套 media query 全部改为 var() 驱动 + 各自 fallback
- `Chat.tsx` 把 `turnCount` 透传给 SilhouetteBackdrop

### 渐变曲线表

| 轮次 | opacity | blur (px) |
|---|---|---|
| 0（未开始）| 0.16 | 8.00 |
| 1 | 0.21 | 7.13 |
| 2 | 0.27 | 6.25 |
| 3 | 0.32 | 5.38 |
| 4 | 0.37 | 4.50 |
| 5 | 0.42 | 3.63 |
| 6 | 0.48 | 2.75 |
| 7 | 0.53 | 1.88 |
| 8+ | 0.58 | 1.00 |

### Changed

- `components/ModeSelector.tsx` · 选中态加 `mode-pill-active mode-pill-active-{id}` 双 class + border-2 + 字重升级
- `components/MessageBubble.tsx` · AI 气泡 padding +4px
- `components/SilhouetteBackdrop.tsx` · 新增 `turnCount` prop + opacity/blur 计算函数 + inline style 注入 CSS vars
- `components/Chat.tsx` · 透传 `turnCount` 给 SilhouetteBackdrop
- `app/globals.css` · 新增 `.mode-pill-active*` 选中态加强样式 + silhouette-img opacity/blur 改为 var() 驱动 + 1.5s 平滑过渡

### 不影响范围

- ✅ v0.7.9.5.0-4 sanitizer 50/50 全 PASS（0 回归）
- ✅ v0.7.9.5.3 KILL/ABC/引号加粗 0 改动
- ✅ v0.7.9.6 段落渐入 0 改动
- ✅ 现有呼吸动画（speaking 时）0 改动（动画绝对值覆盖 var）
- ✅ 老调用方未传 turnCount 会用 fallback 值（0.32/0.30/0.32），表现与改造前一致

### Bug 1 多轮 ABC + KILL 失效

下一波 v0.7.9.5.5.2 处理。根因已从用户截图定位：
- LLM 多轮上下文衰减把 ABC 挤回同一行
- LLM 给了 D 选项但 prompt 只教了 ABC
- LLM 完全漏写 [KILL] 标记
- 末段是金句但前端没法识别

修复策略：prompt 多轮强化 + extractOptions 同行连写支持 + ABCD 4 选项支持 + extractKillStamp 第四层金句特征兜底

---

## [v0.7.9.5.4] - 2026-05-12 — 「专业密度铁律：弹药不是炫技 · 防顾问腔防编造」

> 用户反馈核心痛点：「没深度、不如 Gemini」+ 外部专家方案逐条分析后吸收 80%。
> 核心改造：把「专业感」从「术语堆砌」拉到「精准数据 + 轻术语 + 反例 + 逻辑闭环」四件套。

### 专业密度公式（写入 prompt 最高优先级）

```
专业感 = 精准数据砸脸 + 轻术语紧跟人话转译 + 行业反例举证 + 逻辑闭环戳穿
```

每条回复至少要有**一个专业弹药特征**——数据/术语/反例三选一，不强求三件齐备。

### 轻术语白名单（仅 10 个，其他全禁）

| 术语 | 紧跟转译（必带） | 适用场景 |
|---|---|---|
| JTBD | ——也就是用户要完成的任务 | 戳需求理解错误 |
| LTV | ——也就是用户一辈子能给你花多少钱 | 算商业账 |
| CAC | ——也就是拉一个用户要花多少钱 | 算获客成本 |
| 留存 | ——也就是用户用了还想再来 | 戳产品粘性 |
| 单位经济模型 | ——也就是一个用户能不能让你赚钱 | 拆商业模式 |
| MVP | ——也就是最小可用版本 | 戳贪多求全 |
| 核心壁垒 | ——也就是别人抄不走的东西 | 戳同质化 |
| 北极星指标 | ——也就是你最该盯着的那个数 | 戳目标混乱 |
| 私域 | ——也就是能反复触达的用户 | 戳流量思维 |
| 转化 | ——也就是愿意掏钱的用户比例 | 戳变现 |

**铁律**：
- 必须紧跟 `——也就是 XXX`（不是括号、不是冒号），保护 markdown 加粗不被破坏
- 一段最多 1 个术语，连用 2 个 = 违反铁律
- **绝对禁用** AARRR / Cohort / NPS / OKR / SWOT / Persona / RFM / AIPL / MECE / 4P / STP 等所有生僻或咨询腔术语
- 二轮以上同一个术语在同一对话出现过，可省转译（用户已经懂了）

### 数据使用铁律（防编造）

✅ **准用「区间表达」**：「业内 7 日留存普遍 <15%」「单客 LTV 一般 30-50 元」
✅ **准用「业内常识」**：「业内都知道」「行业平均水平」「很多人测过」
❌ **禁用「精确数字编造」**：「你的 LTV 是 47.3 元」（编的，没出处）

不确定就别说，宁可改用模糊但安全的表达，也不要为了显专业编精确数字。

### 行业反例 5 句式（按场景填空）

1. `就连 [行业头部产品] 都 [失败结果]，你凭什么觉得你能成？`
2. `[赛道] 这条路上，[竞品 A] 和 [竞品 B] 早就 [反例]，你做的差异在哪？`
3. `这个赛道每年有 [大量] 团队做同样的事，活下来的不到 [小比例]`
4. `这个赛道的隐藏成本是 [XXX]，多数人没算过这笔账`
5. `[竞品] 已经免费送了 [功能]，用户为什么找你付费？`

每轮回复至少套用 1 个反例句式（场景匹配时），让 diss 有「打脸感」而不只是「嘴炮感」。

### 三档专业密度差异化

- **scathing**：优先 反例 + 区间数据，术语可有可无（情绪压过专业）
- **rational**：必带 1-2 个术语 + 区间数据 + 简单公式（专业最满）
- **casual**：几乎不用术语，只用「业内都知道」+ 类比（最轻）

### 关键词白名单扩展（带上下文守卫）

`MessageBubble.tsx` 新增中文术语正则：`留存 / 单位经济模型 / 核心壁垒 / 北极星指标 / 私域 / 转化`

**关键设计**：用 lookahead 守卫——只在「术语紧跟 ——也就是 / （也就是」时加粗，避免日常「留存差」「转化低」被误伤。

### 与外部专家方案对比

| 专家建议 | 吸收方式 |
|---|---|
| ✅ 专业弹药公式 | 直接采用，写进 prompt 最高优先级 |
| ✅ 10 个轻术语白名单 + 紧跟转译 | 直接采用，但格式从「（也就是）」改为「——也就是」（保护加粗不破坏）|
| ✅ 禁用 AARRR/Cohort/NPS 等生僻术语 | 直接采用 |
| ✅ 每段最多 1 个术语 | 直接采用 |
| 🔄 反例库 | 转译为 5 个反例句式（让 LLM 自己填，不维护静态库）|
| 🔄 「单客 LTV=47 元」精确数字 | 转译为「区间表达」（30-50 元）+ 「业内常识」模糊措辞，防编造 |
| 🔄 三档差异化术语密度 | 调整：scathing 不强制术语（情绪压过专业）|
| ⏸ 每周动态拉数据更新弹药库 | 暂缓（V2.0 再说）|
| ⏸ 专业度自检规则 | 暂缓（已 17 条铁律够用）|
| ❌ 「（也就是 XXX）」括号格式 | 不吸收（破坏关键词加粗，改用 ——也就是）|
| ❌ 精确编造数字 | 不吸收（风险高，改区间表达）|
| ❌ 「咪蒙之后没靠鸡汤涨粉的大号」反例 | 不吸收（时间敏感 + 政治敏感 + 文化梗冷知识）|

### Changed

- `lib/prompts/index.ts` · `loadFinalReminder` 末尾追加「专业密度铁律」段（轻术语白名单 + 数据区间表达 + 反例 5 句式 + 三档差异化）
- `components/MessageBubble.tsx` · `KEYWORD_PATTERNS` 追加中文术语规则（留存/单位经济模型/核心壁垒/北极星指标/私域/转化），用 lookahead 守卫只在「术语+——也就是」上下文加粗

### 不影响范围

- ✅ v0.7.9.5.0 sanitizer 50/50 单测全 PASS
- ✅ v0.7.9.5.3 KILL + ABC + 引号自动加粗 0 改动
- ✅ v0.7.9.6 段落渐入 / toast / 抽屉 / 12 问矩阵 0 改动

### 验证

- tsc 0 错 / next build ✓ / 0 lint
- 50/50 单测全 PASS
- 真机待硬刷新验证

---

## [v0.7.9.5.3] - 2026-05-12 — 「输出仪式三件套：ABC 按钮化 + KILL 盖章句 + 引号自动加粗」

> 用户感知目标：「姐姐的刀法变了」。
> 核心升级：把 LLM 输出的 3 个关键结构（ABC 选择题 / 灵魂总结句 / 观点强调）从纯文本升级为专属 UI，体验从"读聊天"变"被审判"。

### ABC 选项按钮化（专家 2 P0）

- 新增 `components/OptionButtons.tsx` + `extractOptions()` 工具函数
- **识别策略**：末段正则切出 A/B/C/D 选项，要求 ≥2 个 + 字符 ≥8 + 字母连续（A→B→C）+ AI 消息已 done
- **渲染**：暗灰底圆角按钮 + hover 主题色发光 + 移动端文案完整换行 + 主题色圆形字母标
- **交互**：点击后 280ms 显示"已选择：A"灰态 → 自动把 `A` 当成用户消息发送 → 其他选项禁用锁定
- **prompt 约束**：`index.ts` 追加铁律强制 ABC 每个选项独立成行（避免同行连写被拒识别）

### 醒醒盖章句 KillStamp（版本 1 · 极简侧边线）

- 新增 `components/KillStamp.tsx` + `extractKillStamp()` 工具函数
- **格式**：LLM 在每条回复结尾输出 `[KILL]xxx[/KILL]` 标记
- **渲染**：4px 主题色左竖线 + 「醒醒 ·」楷书前缀 + 17px 稍加粗 + 主题色微发光 + 自左 rise 入场
- **规则**（`lib/prompts/index.ts` 追加）：
  - 字数：15-40 字
  - 调性三档差异化：casual 温柔嘲讽 / rational 冷峻诊断 / scathing 直白扇耳光
  - 位置：永远最末段，独立成段（前后 `\n\n` 隔开）
  - 铁律：漏写即违反铁律
- **保护机制**：
  - sanitizer 白名单优先级最高（KILL 段绝不被黑名单误伤，含 emoji 也保留原样）
  - 引号自动加粗不动 KILL 段（保留原话原味）
- **复制/朗读兼容**：
  - 复制时把 `[KILL]xxx[/KILL]` 还原为 `醒醒：xxx` 可读形式
  - TTS 朗读时把 KILL 拼到末尾念出

### 关键词高亮深化（引号自动加粗）

- `lib/prompts/sanitizer.ts` 新增 `autoBoldQuotedEmphasis()` 工具
- 把 `「xxx」` / `"xxx"` 中 1-12 字的强调词自动转成 `**xxx**`，复用 v0.7.9.5.2 玫瑰金 strong + 主题色发光
- **边界保护**：
  - 已在 ` ` 反引号内 → 不动
  - 已在 `**` 内 → 不动
  - 已在 ` ``` ` 代码块内 → 不动
  - KILL 段内 → 不动（保留原话原味）
  - 长度 > 12 字 → 不动（避免把整段引用包进去）
- `prompt` 追加指令让 LLM 自己在重要观点词上用 `**xxx**` 加粗（每段 2-4 处）

### 健康检查

`scripts/_v0795_sanitizer_health.mjs` 从 35/35 升级到 **50/50 全 PASS**：
- Test 10 新增 5 个 KILL 保护用例
- Test 11 新增 6 个引号自动加粗边界用例
- Test 12 新增 3 个完整链路组合用例

### Added

- `components/KillStamp.tsx` · 极简侧边线金句组件 + `extractKillStamp()` 导出
- `components/OptionButtons.tsx` · ABC 按钮组件 + `extractOptions()` 导出
- `lib/prompts/sanitizer.ts` · `autoBoldQuotedEmphasis()` 引号自动加粗工具

### Changed

- `app/globals.css` · 新增 `.kill-stamp` 极简侧边线样式 + `.option-buttons/.option-btn` 按钮组样式
- `components/MessageBubble.tsx` · 渲染管线重构：`safeContent → extractKillStamp → contentWithoutKill → extractOptions → contentForRender → autoHighlight + autoBoldQuoted → segments`；渲染树追加 OptionButtons 和 KillStamp；复制/引用/朗读全部感知 KILL 拆分
- `components/Chat.tsx` · MessageBubble 透传 `onPickOption={(l) => sendMessageWith(l)}` + `streaming`
- `lib/prompts/index.ts` · `loadFinalReminder` 末尾追加"输出仪式三件套"指令段（ABC 换行 + 观点词加粗 + KILL 标记铁律）
- `lib/prompts/sanitizer.ts` · `sanitizeLLMOutput` 升级加 KILL 白名单保护

### 不影响范围

- ✅ v0.7.9.5.0 sanitizer 污染过滤完全兼容（35/35 原用例全 PASS）
- ✅ v0.7.9.5.1 三档主题色 0 改动
- ✅ v0.7.9.5.2 关键词高亮白名单 0 改动（在 autoHighlightKeywords 之后追加 autoBoldQuoted）
- ✅ v0.7.9.6 段落渐入 / toast / 抽屉 / 12 问矩阵 0 改动
- ✅ 用户消息原样保留（所有处理仅作用于 AI 消息）

### LLM 漏标兜底

如果 LLM 某次漏写 `[KILL]xxx[/KILL]`，KillStamp 不显示，回复正常呈现。**不崩溃**。

如果 LLM 把 `[KILL]` 标记跨 `\n\n` 边界写坏，sanitizer 不会把它当金句处理，会作为普通文本显示（用户会看到 `[KILL]xxx[/KILL]` 字样），此时用户反馈我们再迭代 prompt 约束。概率极低且有明显日志。

---

## [v0.7.9.6] - 2026-05-12 — 「交互人设强化（段落渐入 + 重入 toast + 抽屉框架 + 12 问隐喻进度）」

> 用户感知目标：「姐姐活了」。
> 核心交互升级：段落出现的"刀感"+ 御姐风格重入提示 + 抽屉式侧栏 + 12 问命中数隐喻可视化。

### 段落级渐入（辩手节奏）

新增 `SegmentedMarkdown` 子组件：把 LLM 输出按 `\n\n` 切段，每段独立渲染 + 段落入场 fade+slide 动画。
**防闪烁机制**：useRef 缓存"已渲染过段数"，SSE delta 增量到来时只对新段加 `segment-fade-in` class，旧段保持 `segment-stable` 不重跑动画——避免 chunk 频繁触发让全部段闪烁。

效果：「姐姐一刀一刀出」的辩手节奏感，不延迟整体响应速度（CSS animation 走 transform/opacity GPU 合成层，0 layout 触发）。

### 御姐风格重入 Toast（专家2 建议）

新增 `Toast` 通用组件——右上角浮入，暗色磨砂底 + 主题色边框 + 主题色发光，3.5s 自动消失，点击立即关闭。

ChatShell mount 时如果恢复到了真实对话历史，从 3 条文案随机选一条触发：
- `刚才聊到一半就跑了？`
- `回来了？姐还以为你被扇怕了。`
- `今天打算认真点不？`

### 抽屉式侧栏（框架版）

新增 `SideDrawer` + `DrawerTriggerButton` 组件。

**触发**：仅 locked 状态（已开始对话）顶部状态栏左侧显示三横线图标。
**桌面**：从左滑入 280px。
**移动**：88vw 全屏覆盖（max 320px）。
**交互**：遮罩点击关闭、ESC 关闭、锁页面滚动。

**内容（v0.7.9.6 框架版，v0.7.9.7 接真数据）**：
- 顶部：`姐替你熬过的` 标题
- 当前会话卡片（已聊 N 轮）
- 「熬过的项目」占位（v0.7.9.7 接 useChatPersistence 多桶接口）
- 底部：12 问矩阵进度（MatrixProgress 组件）

### 12 问矩阵隐喻化进度

新增 `MatrixProgress` 组件 + 后端 SSE 增量字段。

**视觉**：4×3 暗色方块网格，跟着 q_progress（0-12）逐个亮起；亮起的方块用主题色填充 + 主题色发光 + 1.4s 呼吸脉动。

**数据来源**：
- 后端 `lib/prompts/q_picker.ts` 新增 `countDistinctQHit(history)` 函数，统计 history 里 assistant 消息出现过的去重 Q 数量
- `app/api/chat/stream/route.ts` 在 meta 事件 + done 事件追加 `q_progress: number` 字段
- 前端 `ChatShell` 接 `q_progress` state，typeof number 兜底（老后端缺失走 0，不爆）

**严守隐喻化原则**（用户拍板 Q2-A）：
- **无 tooltip / 无标签 / 无数字**——只暴露视觉呼吸感，不告诉用户"这是 Q Picker"
- 把「姐姐内部方法论」与「外部对话感」严格分层（坚决不暴露 12 问框架，跟 v0.7.9.4 反顾问引导人设保持一致）

### Added

- `components/Toast.tsx` · 御姐风格 toast 组件（右上角浮入 / 单 toast / 自动关闭）
- `components/SideDrawer.tsx` · 抽屉式侧栏 + DrawerTriggerButton 触发按钮
- `components/MatrixProgress.tsx` · 12 问矩阵 4×3 暗方块进度
- `lib/prompts/q_picker.ts` · 新增 `countDistinctQHit(history)` 导出函数

### Changed

- `app/globals.css` · 新增 `.segment-fade-in/.segment-stable` 段落渐入、`.xx-toast/.xx-toast-out` toast、`.xx-drawer-*` 抽屉、`.xx-matrix-cell-lit` 矩阵亮起脉动
- `components/MessageBubble.tsx` · 新增 SegmentedMarkdown 子组件，渲染层从单 ReactMarkdown 拆为多段独立渲染 + ref 缓存防闪烁
- `components/ChatShell.tsx` · 新增 drawerOpen / toastMsg / qProgress 三个 state；mount 恢复对话时触发重入 toast；SSE meta/done 解析 q_progress；return 段挂 SideDrawer + Toast 组件
- `components/Chat.tsx` · 新增 onOpenDrawer 可选 prop；locked 状态顶部状态栏左侧挂 DrawerTriggerButton
- `app/api/chat/stream/route.ts` · meta 事件 + done 事件追加 q_progress 字段（assistant 落地前后两次同步）

### 不在本批范围（v0.7.9.7 处理）

- ⏭ 抽屉里"熬过的项目"接持久化多桶真数据
- ⏭ 切档前确认弹窗 + 切档行为重写（按档分桶持久化）
- ⏭ schema v1 → v2 平滑迁移
- ⏭ 移动端键盘遮挡修复 + textarea 自适应

---

## [v0.7.9.5] - 2026-05-12 — 「UX 视觉地基（三档主题色 + 气泡重构 + 加载人设化 + 关键词高亮）」

> v0.7.9.5.0 紧急修复（输出污染双层兜底）已于 commit 35b40af 上线，本节追加 v0.7.9.5.1/5.2 两个子项。
> 用户感知目标：「界面变好看了」「姐姐有温度了」。

### 三档主题色锁死（v0.7.9.5.1）

新增 `--mode-color` / `--mode-glow` / `--mode-tag-bg` 等 CSS Variables，跟随 `[data-mode]` 切换：

| 档位 | 主题色 | 调性 |
|---|---|---|
| **casual** | `#8b3a72` 暗夜玫瑰紫 | 慵懒紫 · 姐不陪你做梦但也不骂你 |
| **rational** | `#d4af7a` 玫瑰金 | 手术室质感 · 拆结构 |
| **scathing** | `#a83244` 暗血红 | 血浆干涸的色 · 警告意味的极深暗红（绝不亮红）|

**保留品牌色系**：未采用专家提的 `#D170E8/#64748B/#991B1B`（专家提的粉紫太甜跟"暗夜御姐"调性冲突），改为锁定现有 xx-purple/xx-gold/xx-red 三色作为主题色变量。

### 顶部档位标签 pill 醒目化（v0.7.9.5.1）

修复用户截图反馈"档位字太淡看不清当前在哪一档"——
顶部从 `醒醒 · 扇巴掌 第 N 轮过招` 拆为：
- `醒醒` 品牌名（chat-session-title）
- 档位 pill：圆角 + 主题色背景 + 主题色边框 + 主题色发光 + 圆点（`mode-pill` 新样式）
- `第 N 轮`：N 用主题色而非固定金色

### 输入区主题色化（v0.7.9.5.1）

- focus-within 边框：`xx-gold` → `var(--mode-color)`（`.input-mode-focus` 新样式）
- 送出按钮：固定金色 → 主题色（`.send-btn-mode` 新样式，scathing 暗红配米色字、其他配深底字以保对比度）

### 加载状态人设化（v0.7.9.5.2 · 替换原"醒醒正在打字……"）

三档差异化文案 + 主题色跳点动画：
- casual: `姐正在嫌弃你的想法……`
- rational: `姐正在核算你的逻辑……`
- scathing: `姐正在翻你的旧账……`

3 个跳点 jump 动画错位 200ms/400ms，主题色 + 主题色发光，`.loading-persona` / `.loading-dots` 新样式。

### 关键词自动高亮（v0.7.9.5.2）

新增 `autoHighlightKeywords()` 工具，按白名单把竞品名/术语/数字百分比自动包成 markdown `**`，复用 `.markdown-body strong` 玫瑰金 + 追加主题色 text-shadow 发光：

- **竞品名**：Character.AI / Replika / GPT-4o / Sora / Boss直聘 / 小红书 / 抖音 / 微信 / Notion / Canva 等 ~40 个
- **术语**：CAC / LTV / PMF / DAU / MAU / GMV / MRR / ARR / ROI / NPS / MVP / PRD / JTBD / SaaS 等
- **数字**：百分比（80%）、倍数（3x / 10倍）、规模（500万 / 1.2亿）

**边界保护**：用切分重组算法保护已包裹片段——
- 已在 ` ` 反引号里的不动（不破坏代码）
- 已在 `**` 内的不动（避免重复加粗破坏语法）
- 已在 ``` ``` 代码块里的不动

### 聊天气泡视觉重构（v0.7.9.5.2）

| 元素 | 原 | 新 |
|---|---|---|
| AI 气泡圆角 | `rounded-2xl rounded-tl-sm` | `rounded-[20px] rounded-tl-[6px]`（更圆 + 小尾巴） |
| AI 气泡 padding | `px-4 py-3` | `px-5 py-4`（更舒展） |
| AI 气泡边框 | `border-xx-border` 固定灰 | `var(--mode-tag-border)` 主题色弱描边 |
| AI 气泡发光 | 无 | `0 0 18px -8px var(--mode-color-strong)`（主题色微发光，hover 加强） |
| 用户气泡 | `border-xx-border bg-xx-bg-2` | `border-xx-border/60 bg-xx-bg-2/70`（弱化对比，让醒醒气泡视觉权重 > 用户）|
| 消息间距 | `space-y-4` (16px) | `space-y-6` (24px) |

### 动态 placeholder（v0.7.9.5.2）

输入框 placeholder 跟随档位（首轮和续聊都生效）：

| 档位 | 续聊 placeholder（专家2）| 首轮 placeholder（保留现有）|
|---|---|---|
| casual | `想清楚了再回我。` | `又有新想法？说说看…（上次那个呢）` |
| rational | `别绕弯子，说重点。` | `说。我只问一句——谁付钱，付多少，付几次。` |
| scathing | `还没被扇够？继续。` | `把你最得意的那个 idea 丢过来。我专挑你没敢看的那一页。` |

### Changed

- `app/globals.css` · 新增三档主题色 CSS Variables、`.mode-pill` 醒目化标签、`.input-mode-focus` 主题色聚焦、`.send-btn-mode` 主题色按钮、`.loading-persona`/`.loading-dots` 加载状态、`.ai-bubble` 主题色边框发光、`.markdown-body strong` 关键词主题色发光
- `components/Chat.tsx` · 顶部档位 pill 改造、消息列表间距 +50%、输入区按钮+边框主题色化、动态 placeholder 三档差异化（首轮+续聊）
- `components/MessageBubble.tsx` · 加 `autoHighlightKeywords()` 关键词预处理、AI 气泡圆角/padding/主题色边框、用户气泡弱化、加载状态三档人设化文案

### 不在本批范围（推迟到后续批次）

- ⏸ 32px 醒醒头像（现有"圆点 + 醒醒 · 档位"上行已够身份识别，避免破坏响应式布局，推迟）
- ⏭ v0.7.9.6 段落渐入 / 重入 toast / 抽屉框架 / 12 问矩阵进度
- ⏭ v0.7.9.7 持久化 schema v2 + 切档弹窗 + 移动端键盘适配

---

## [v0.7.9.5.0] - 2026-05-12 — 「🚨 LLM 输出污染紧急修复 · 双层兜底」

> **Hotfix · 真机暴露 scathing 第 1 轮把内部 system prompt 状态原样 echo 到对用户回复**
> 用户截图：scathing 第 1 轮简历模板提问，回复顶部赫然出现：
> ```
> ⚠️ 当前轮次：第 1 轮 · scathing 档
> 结构铁律核验通过？ 否 — 重新生成中…
> ```
> 同时段落标题前 LLM 模仿 `_arsenal.md` 的 🟢🟡🔴 档位标识，自己造了 `🟢 刀锋追问（1 把刀）` 的 emoji marker。
> 用户看到内部代号 → 直接出戏，人设和专业感双重塌陷。

### 双层兜底架构

| 层 | 位置 | 作用 |
|---|---|---|
| **L1 prompt 治本** | `lib/prompts/index.ts` final_reminder 末尾 | 显式追加"输出污染绝对黑名单"指令，列出所有内部代号/铁律名/状态词/emoji marker 黑名单 |
| **L1 prompt 治本** | `lib/prompts/_arsenal.md` 第 188-190 | 删掉 `casual 🟢 / rational 🟡 / scathing 🔴` 的 emoji 档位标识，避免 LLM 模仿 |
| **L2 代码治标** | `lib/prompts/sanitizer.ts`（新建） | 通用过滤工具：按 `\n\n` 分段，段首命中黑名单整段 strip；行首 emoji marker 单独剥掉 |
| **L2 代码治标** | `app/api/chat/stream/route.ts` SSE | 在已有的 `stripStageDirections` 行级过滤之后再叠一层段缓冲 sanitizer，按段 emit |
| **L2 代码治标** | `components/MessageBubble.tsx` 渲染前 | 前端再 sanitize 一次，双保险（防止后端漏过的 edge case） |

### 黑名单设计（边界保护）

段首匹配必须是"具体短语"，避免误伤用户原话：

- ❌ 仅匹配"档"字 → 会误伤 "你想做哪一档付费？"
- ✅ 匹配 "scathing 档" / "casual 档" / "rational 档" 完整短语
- ✅ 匹配 "重新生成中" 完整短语，不误伤 "你需要重新生成简历"

完整黑名单：
- 内部状态词：`⚠️ 当前轮次` / `当前轮次：` / `结构铁律核验` / `核验通过？` / `重新生成中` / `整条重写`
- 内部档位代号：`scathing 档` / `casual 档` / `rational 档`（含半角无空格变体）
- 内部铁律名：`70/20/10` / `70-20-10` / `forced choice 段` / `ABC 段`
- 元词汇：`DIRECTOR_NOTE` / `[DIRECTOR_NOTE`
- 行首 emoji marker：`🟢` / `🟡` / `🔴` / `⚠️` / `🚨`（仅行首，行内自然 emoji 不剥）

### 验证

`scripts/_v0795_sanitizer_health.mjs` · **35/35 全 PASS**：
- Test 1 真机污染样本 5/5 ✅
- Test 2 行首 emoji marker 4/4 ✅
- Test 3 行内 emoji 保留 1/1 ✅
- Test 4 内部档位代号段 strip 3/3 ✅
- Test 5 用户合法用词不被误伤 4/4 ✅
- Test 6 内部铁律名段 strip 3/3 ✅
- Test 7 多段混合处理 6/6 ✅
- Test 8 流式增量切段 7/7 ✅
- Test 9 边界条件 2/2 ✅

### Added

- `lib/prompts/sanitizer.ts` · `sanitizeLLMOutput(text)` 整段过滤 + `sanitizeStreamSegments(buffer)` 流式增量切段
- `scripts/_v0795_sanitizer_health.mjs` · 健康检查脚本，35 个用例覆盖污染/边界/流式

### Changed

- `lib/prompts/index.ts` · `loadFinalReminder` 末尾追加"输出污染绝对黑名单"指令段，最高优先级
- `lib/prompts/_arsenal.md` · 第 188-190 表格档位列删 🟢🟡🔴 emoji
- `app/api/chat/stream/route.ts` · `flushLine` 之后接段缓冲 sanitizer，流结束时单独 flush 尾段
- `components/MessageBubble.tsx` · `safeContent = useMemo(sanitizeLLMOutput(message.content))`，ReactMarkdown / AudioPlayer / handleQuote / handleCopy 全部消费 safeContent

### 不影响范围

- ✅ v0.7.9.3 错误处理 toFriendlyError 0 改动
- ✅ v0.7.9.4.x 升级节注入逻辑 0 改动
- ✅ q_picker / arsenal 命中 / methodology 加载 全 0 改动
- ✅ 用户消息原样保留（sanitizer 仅作用于 AI 输出）

---

## [v0.7.9.4.2] - 2026-05-12 — 「真机走查发现 ABC 铁律架构冲突 · 修 P1」

> **Hotfix · 真机走查发现 scathing/rational 第 1 轮仍被强压给 ABC**
> v0.7.9.4.1 修完注入链路之后走查，升级节确实上线了 90%，但 scathing 第 1 轮还是给了
> `A. 付费社群 / B. 1对1咨询 / C. 电商带货` — 违反"前 2 轮不抛 ABC"铁律。

### 走查发现的 P1 根因

`loadFinalReminder()` 是**无参数函数**，一刀切给所有档所有轮次同一份铁律：
> **3. 末尾必有编号 forced choice** — 数一数：我末尾有 ≥ 2 个 A/B/C 编号选项吗？没有就加到够

这条铁律在 final_reminder 尾位首尾夹击的**最高权重位**，压过了 v0.7.9.4 升级节的"前 2 轮不抛 ABC"。
→ LLM 听 final_reminder 不听升级节，第 1 轮照样给 ABC 强压。

### 修复

`loadFinalReminder(mode, userTurnCount)` 改为**轮次感知**：

| mode × 轮次 | 铁律 3 |
|---|---|
| casual（任何轮） | 末尾必有 A/B/C 编号（casual 升级节本来就允许第 1 轮给 ABC） |
| rational / scathing · 第 1-2 轮 | ❌ **严禁 ABC** + 严禁路径建议 + 严禁温柔收尾 + ✅ 必须以反问拉数字收尾 |
| rational / scathing · 第 3+ 轮 | 末尾必有 A/B/C 编号（升级节第 3 轮起解锁 ABC） |

同时把"当前轮次 + 档位"显式写进 prompt 顶部让 LLM 更容易 anchor：
`**当前轮次：第 N 轮 · scathing 档**`

### Changed

- `lib/prompts/index.ts` · `loadFinalReminder` 加 `mode` + `userTurnCount` 参数，前 2 轮 rational/scathing 走翻转铁律支路

### Build

- TypeScript 0 错误 · Lint 0 警告 · next build 通过

### 0 mind repo 改动

本次修复全部在主 repo 的 final_reminder 文案层，不动 mind repo，不动升级节内容。

---

## [v0.7.9.4.1] - 2026-05-12 — 「v0.7.9.4 注入链路修复 · maxTokens 上调」

> **Hotfix · 走查发现 v0.7.9.4 改的 mind 文件根本没生效**
> 走查 `lib/prompts/index.ts` 注入链路时定位 2 个高危问题，立刻修复。

### 走查发现的 2 个高危问题

#### 问题 1 · v0.7.9.4 升级节注入链路缺失

`arsenal_addon/{casual,rational,scathing}.md` 的 v0.7.9.4 升级节包含**第 1-2 轮翻转节奏**等关键约束，
但旧链路只在 `userTurnCount >= 3` 才注入，且 `addonQ` 存在时根本不会读到 `addonFull`。
→ **v0.7.9.4 改的"翻转节奏 / 不抛术语 / 不给 ABC"等第 1-2 轮规则形同虚设**。

`_response_protocol.md` 顶部的 7 条横切总则只在用户说"不知道/没想过"等触发词时注入，
正常对话压根触发不到。
→ **三档共同抬杠基线 / 翻转 ≠ 顾问引导 等总则也基本没生效**。

#### 问题 2 · maxTokens 偏低导致后段被截断

| 档 | 旧 | 风险 |
|---|---|---|
| casual | 800 | 50% 降维打击案例易截断 |
| rational | 1200 | 字数下限 350 + 1-3 术语转译 + ABC 顶到边界 |
| scathing | 900 | 30/50/20 配比 + 第 3 轮温柔收尾会被切掉，末段崩塌 |

这是用户反馈"多轮质量衰减"的硬件原因之一——不是 DS 模型有幻觉，是被 max_tokens 切掉了尾部。

### 修复方案

#### Fix 1+2+3 · 注入链路重建（`lib/prompts/methodology_loader.ts` + `index.ts`）

新增 2 个切片 loader：
- `loadV094Persona(mode)`：从 `arsenal_addon/{mode}.md` 切出 `## v0.7.9.4 升级` 之后的全部内容
- `loadV094Protocol()`：从 `_response_protocol.md` 切出 `## v0.7.9.4 总则` 到 `## 决策树` 之间的内容

在 `buildSystemPrompt` 的 step 3.5 位置（dynamic 之后、arsenal 之前）**永远注入**这两层，
**不再依赖 userTurnCount >= 3 或 trigger 词触发**。

代价：每轮 system prompt 增加 ~2K tokens（v094Persona ~1.5K + v094Protocol ~600）— 完全可控。

#### Fix 4 · maxTokens 上调（`lib/prompts/index.ts` MODES）

| 档 | 旧 | 新 | 增幅 |
|---|---|---|---|
| casual | 800 | **1200** | +50% |
| rational | 1200 | **1600** | +33% |
| scathing | 900 | **1500** | +67% |

DS-chat 原生支持 8K 输出，1500 完全没压力，反而是旧值偏低导致的尾部截断才是质量衰减真凶。

### 验证

新增 `scripts/_v094_health.mjs` 健康检查脚本，验证两个切片 loader 正确性：
- ✅ casual 升级节 2068 chars · 5/5 关键词命中
- ✅ rational 升级节 2573 chars · 4/4 关键词命中
- ✅ scathing 升级节 3078 chars · 7/7 关键词命中
- ✅ protocol 总则节 1583 chars · 干净不串决策树 · 7/7 关键词命中
- **总计 24 PASS / 0 FAIL**

### Changed

- `lib/prompts/methodology_loader.ts` · 新增 `loadV094Persona` + `loadV094Protocol`
- `lib/prompts/index.ts` · 注入链路加 step 3.5 + MODES 三档 maxTokens 上调
- `scripts/_v094_health.mjs` · 新增切片健康检查

### Build

- TypeScript: 0 错误
- Lint: 0 警告
- next build: ✅ 通过

### 0 mind repo 改动

本次 hotfix 全部在主 repo · 不动 mind repo · 不改 v0.7.9.4 内容。

---

## [v0.7.9.4] - 2026-05-12 — 「三档人格升级 · 扇巴掌带干货 · 三视角分工」

> **Patch · 三轮外部专家深度评审 + 用户精准拍板**
> 朋友实测 v0.7.9.2 后吐槽核心 P2「他自己还说不清话呢就想跟人吵架」。
> 这版只做一件事：**让醒醒每档都有姐姐抬杠味 + 有专业含量 + 不变顾问腔**。

### 背景

朋友 Gemini 对比图显示：醒醒 0 个专业名词，Gemini 6 个专业名词。
但用户反馈核心**不是"骂得不够狠"**，而是**"骂不到点子上 + 杠精表演欲压住了价值交付"**。

经过三轮外部专家评审（战略级 / 战术级 / 产品哲学级）+ 用户多轮精准拍板，
确定本版只动 prompt 层（4 个 mind repo md 文件 + 1 个 CHANGELOG），不动任何 React 代码。

### 核心改动 · 三档视角分工 + 配比硬规则

#### 1. casual 档 · 行业百事通视角

| 段 | 配比 |
|---|---|
| 嫌弃吐槽 | 15% |
| 降维打击（具体失败案例 + 真实竞品数字） | 50% |
| 追问（基于行业现状） | 20% |
| ABC 编号 | 15% |

**核心人设**：嫌弃但宠溺的吐槽小妹。"上周姐刚看一个跟你做的几乎一模一样的小程序，做了三个月最后那哥们去摆地摊卖红薯了"。

#### 2. rational 档 · 资深合伙人视角

| 段 | 配比 |
|---|---|
| 冷静开场（一针见血指漏洞） | 25% |
| 结构化拆解（1-3 术语 + 数字 + Unit Economics） | 45% |
| 方向性建议（施舍口吻） | 15% |
| ABC 强制选择 | 15% |

**核心人设**：冷静但锋利的资深合伙人。"你连最基本的 Unit Economics 都算不清楚，就想在那儿谈社会价值？"

#### 3. scathing 档 · 直觉怪兽 / 心理学家视角（用户最吐槽档，重点改造）

| 段 | 配比 |
|---|---|
| 见血封喉（指出他没想到的痛点） | 30% |
| 逻辑吊打（逻辑为主，数据为辅） | 50% |
| 灵魂审讯（反问拷问荒谬） | 20% |

**关键澄清**：50% 不是"数据吊打"（那是 rational 档），是"逻辑悖论 + 行业终局思维"为主，1 个数字撑腰。

### 三档共同基线（_response_protocol.md v1.1 横切总则）

7 条横切铁律：
1. **姐姐抬杠基线** — 不能变 Gemini / ChatGPT / 心理咨询师 / PPT 输出机
2. **翻转节奏** — 第 1 轮拉用户进数字语境，第 2 轮深度追问，第 3 轮起术语+路径建议+温柔收尾
3. **翻转 ≠ 顾问引导** — 只问数字 / 事实 / 行动 / 名单，绝不问感受 / 体验 / 情绪
4. **术语转译公式** — `[术语] + (人话翻译，≤15字)`。三档分级：casual 0-1 / rational 1-3 / scathing 0-1
5. **三红线** — 禁连续两句术语 / 禁术语替代戳穿动作 / 禁前 2 轮抛术语
6. **ABC 时机** — 第 1 轮不给（防上来强压），第 2-3 轮再给
7. **温柔收尾** — 仅 scathing 档第 3 轮起出，且必须是"骂归骂姐没让你别干"那种硬温度，禁止"姐知道你不容易"软鸡汤

### 改造前后对比 · 公众号 2 万粉场景（scathing 档第 1 轮）

#### 改造前（v0.7.9.3 现状）
> 噗——又一个公众号作者？2 万粉就想聊下一步？姐告诉你，公众号早死了。
> 三条路自己挑：A 全垂直 / B 全视频化 / C 当日记本。选不出来别浪费我时间。

**问题**：上来就抛结论 + 3 个 ABC 强压 + 0 数字 + 没温度

#### 改造后（v0.7.9.4）
> 噗——2 万粉就想聊下一步？行，姐听你说说。
>
> 你这 2 万粉是几年攒的？最近三个月单篇平均阅读多少？这些数说出来咱才有的聊。
>
> 但姐先给你打个预防针：公众号图文打开率 2024 年已经跌破 1.5%（行业均值），你 2 万粉现在能稳定打开的可能就 200-300 人。
>
> 这数字你能接受吗？

**特征**：第 1 轮没抛结论 + 用反问拉进数据语境 + 姐姐味全程 + 行业真相数字 + 没用术语（前 2 轮不用术语红线）

### Changed · 4 个 mind repo md 文件

| 文件 | 改动 | mind repo commit |
|---|---|---|
| `arsenal_addon/scathing.md` | 加 v0.7.9.4 升级节（30/50/20 配比 + 翻转 + 第 3 轮温柔收尾 + 3 模板 + 3 轮范例 + 反例） | a0dc4f8 |
| `arsenal_addon/casual.md` | 加 v0.7.9.4 升级节（15/50/20/15 配比 + 嫌弃宠溺底色 + 失败案例画面感 + 反例） | b221c15 |
| `arsenal_addon/rational.md` | 加 v0.7.9.4 升级节（25/45/15/15 配比 + 施舍口吻 + 1-3 术语 + 反例） | a938be2 |
| `_methodology/_response_protocol.md` | v1.0 → v1.1 顶部加 7 条横切总则 | 73d4fe0 |

### 做法 · 完全保留原有 Q1-Q12 弹药

本版**只在每个 md 文件末尾追加 v0.7.9.4 升级节**，不动原有 Q1-Q12 弹药。
做法是"叠加约束"而不是"重写内容"，4 个文件一共 +418 行 -2 行，scathing/casual/rational 三档独立 commit 可单独回滚。

### Removed · 无

### Fixed · 缓解用户反馈 P2

朋友实测「为了杠而杠 + 没专业含量 + 没温度」→ 通过三档分级配比 + 翻转节奏 + 术语转译规则 + scathing 第 3 轮温柔收尾解决。

### 真机验证清单（建议用户实测）

**casual 档**：
- [ ] 第 1 轮看是否抛具体失败案例（带画面感的"上周姐刚看一个..."）
- [ ] 嫌弃口头禅（啧 / 行吧 / 哎呦）保留
- [ ] 第 1 轮没有术语，第 1 轮没有 ABC

**rational 档**：
- [ ] 字数下限 350 字保留
- [ ] 第 2 轮起出现术语 + 转译（≤15 字）
- [ ] 施舍口吻给路径（"你两条路，要么 X 要么等死"）
- [ ] 一针见血指漏洞（"嗯。你这事最大的黑洞在 X"）

**scathing 档（重点）**：
- [ ] 第 1 轮**不抛结论**，先用反问拉用户进数字语境
- [ ] 第 1 轮**没有术语**
- [ ] 第 1 轮**没有温柔收尾**
- [ ] 第 2 轮深度追问，仍不抛术语
- [ ] 第 3 轮**首次出术语**（必带转译）
- [ ] 第 3 轮**首次出温柔收尾**（"骂归骂没让你别干"那种硬温度）
- [ ] 不出现"您觉得"/"建议您"/"基于 XX 模型分析"等 Gemini 顾问腔

### 没改的部分（明确声明）

- ❌ 不动 12 问 picker（lib/prompts/q_picker.ts）
- ❌ 不动 methodology_loader / arsenal_picker
- ❌ 不动 ChatShell / WakeUpIntro / ModeSelector
- ❌ 不动 StatsBanner / /admin（v0.7.9.2 上线稳定）
- ❌ 不动 v0.7.9.3 持久化代码
- ❌ 不做诊断书机制（等平均对话 ≥5 轮再考虑，留 v0.7.9.5+）

### 下一版预告

**v0.7.9.5+**：等真机数据回来（看平均对话轮数、scathing 档使用率、用户反馈），再决定下一步是做"诊断书机制"（第 5 轮起主动给条件路径式建议）还是其他方向。

---

## [v0.7.9.3] - 2026-05-12 — 「会话不丢了 · localStorage 7 天持久化」

> **Patch · 用户反馈直接修复** · 朋友实测后说"没有储存，我之前聊过的，关了，就不见了"
> 这一版只做一件事：把 messages 从纯内存搬进 localStorage。
> 关 tab、刷新、明早再开都还在；7 天 TTL；50 条上限；无痕模式 fallback 内存。

### 背景

v0.7.9.2 上线后用户朋友实测反馈 5 个问题（P1-P5）。
本轮聚焦 **P4 会话持久化**——这是最硬的体验 bug，工时小见效大，先修。
其他 P1/P2/P3 留 v0.7.9.4 处理（那批是改人格/改弹药库，需要更多设计讨论）。

### 改动策略

`messages / sessionId / mode` 三件套写进 `localStorage`，下次进站隐性恢复。
不弹"欢迎回来"提示（保持纯净）；不做跨标签同步（过度工程）；不做多会话切换（留 v0.8.x）。

### Added · 新增 1 个 hook + 1 个埋点事件

| 新增 | 作用 |
|---|---|
| `hooks/useChatPersistence.ts` | 封装 localStorage 读写 + TTL + 容量上限 + 隐私模式 fallback |
| `analytics.ts` 新事件 `session_restored` | 看持久化的实际命中率（多少用户回来时用上了恢复） |

### Changed · 接入 ChatShell

- mount 后用 `initial` 隐性恢复 `mode + sessionId + messages`
- `mode/sessionId/messages` 任一变化后自动 persist
- "清空重开"按钮同步 `clearPersistence()`，避免清完又被恢复

### 关键设计点

| 维度 | 决策 | 原因 |
|---|---|---|
| 存储 key | `xx_chat_session_v1` | 带版本号，将来数据结构升级可平滑迁移 |
| TTL | 7 天 | 三个月前的对话不该还在；同时 7 天足够覆盖周末断档 |
| 容量上限 | 50 条 | 防止塞爆 5MB localStorage；超出丢最旧 |
| schema 不匹配 | 当无效，重置 | 将来加字段时不会崩 |
| TTL 过期 | 自动 `removeItem` | 不留垃圾 |
| 流式恢复修复 | 所有 `done:false` 强制改 `done:true` | 防止刷新后看到永远在"打字中"的死气泡 |
| 空状态 | 不写 storage（直接 remove） | 清空后不会被空数据覆盖 |
| 隐私模式 | try/catch 包裹，fallback 内存 | 跟 MicInput 同款处理，永不崩溃 |
| sessionId 必须存 | 是 | 不存的话恢复后第二轮 AI 不知前情 |

### Removed · 无

### Fixed · 修复用户反馈 P4

「没有储存，我之前聊过的，关了，就不见了」→ 解决。

### 真机验证清单（建议用户实测）

- [ ] 发 3-4 轮消息 → 关 tab → 重新打开 → 应该看到原对话 + 输入框可继续
- [ ] 刷新页面 → 应该看到原对话 + 档位还是上次锁定的那档
- [ ] 点"清空重开" → 关 tab → 重新打开 → 应该是空状态
- [ ] 隐私/无痕模式打开 → 应该不崩溃，只是关 tab 后会丢（fallback 内存）
- [ ] 7 天后再打开（或手动改系统时间测试）→ 应该自动清空

### 没改的部分（明确声明）

- ❌ 不动 StatsBanner（v0.7.9.2 刚上线稳定）
- ❌ 不动 `/admin` 后台
- ❌ 不动 12 问 picker
- ❌ 不动三档人格 prompt（P2 改造留 v0.7.9.4）

### 下一版预告

**v0.7.9.4**：P2 扇巴掌档"骂得有技术含量"——三段式公式（刀锋开场 + 专业拆解 + 反问钩子 + 温柔收尾）+ 专业名词白名单。
当前在等外部专家意见反馈，确认设计后再动手。

---

## [v0.7.9.2] - 2026-05-12 — 「自建数据面板 · 主页长出"已服务多少人"」

> **Patch · 数据主权回归** · 放弃 Vercel Pro 付费墙，改用 Upstash Redis 自建统计
> 主页第一次长出运营数据：「醒醒已陪 N 位朋友 · 捶过 M 轮 · 此刻 X 人在线」
> 配套后台 `/admin` 看 11 项核心指标 + 14 天每日日志，4 层鉴权防爆破。

### 背景

v0.7.9.1 部署后发现 Vercel Analytics **Hobby 免费版不让看自定义事件**（"Upgrade to Pro"付费墙）。
→ 埋点在跑但数据看不到，等于白做。

### 改动策略

**不升 Vercel Pro（$20/月）**，改为自建 Upstash Redis（免费 10K commands/day + 256MB）：
- 新增 9 张 KV 表：UV set / 轮数 / 三档 / 在线 TTL / 轮次漏斗 / 长度分布 / 错误细分 / 每日分桶 / 极值
- 前端埋点**双写**：保留 `@vercel/analytics`（未来升级 Pro 可用），并行写自建后端
- 心跳机制：首次发消息后每 30s `sendBeacon` 一次，续约在线 TTL 120s，tab 隐藏时暂停

### Added · 三个新 API + 两个新页面 + 一个新组件

| 新增 | 作用 |
|---|---|
| `/api/stats/track` (Edge) | 接收 10 种事件，并行写 9 张 KV 表 |
| `/api/stats/summary` (Edge · 60s CDN cache) | 主页拉 3 核心数据，无鉴权 |
| `/api/stats/admin?key=XXX` (Edge) | 后台私密，返回 11 项指标 + 14 天日志 |
| `/admin?key=XXX` | 自建仪表盘页，醒醒品牌配色 |
| `<StatsBanner/>` | 首屏新组件，替换 EmptyState 原 `LOADING IN PROGRESS` 小字位 |
| `lib/stats/kv.ts` | Redis 客户端封装 + 内存降级 fallback |
| `lib/stats/keys.ts` | KV 键名收口，避免硬编码散落 |

### 主页视觉变化

**保留**：顶栏右上 `LOADING IN PROGRESS`（个人签名不动）
**替换**：EmptyState 中间那行 `LOADING IN PROGRESS` → 换成：

```
    醒醒已陪 1,247 位朋友 · 捶过 8,653 轮
       · 此刻还有 3 人正在被骂醒 ·
```

视觉融入 5 条铁律：
1. 玫瑰金/玫瑰粉配色（绝不引入新色）
2. Cormorant 斜体衬线主行 + Manrope 粗体数字（跟 logo 字体体系对齐）
3. 首次进场 600ms fade + 数字 1.1s 滚动（only 首次，之后静默）
4. 冷启兜底（`totalRounds < 30` 时切"醒醒刚开张几天 · 已陪 N 位朋友醒过来"）
5. 数据失败时组件 `return null`，永远不显示骨架闪烁

三档人格分布用 hover / 点击 ▾ 展开：条形图 + 百分比 + 绝对值。

### 后台 `/admin` 内容清单

| 板块 | 内容 |
|---|---|
| KV 连接状态 | 🟢 真连接 / 🟡 内存降级 指示灯 |
| 核心指标 ×6 | UV / 开聊 / 总轮 / 平均轮 / 最长 / 当前在线 |
| 二级指标 ×4 | 追问点击数 · 预制命中 · 清空重开 · 错误总数 |
| 开场漏斗 | 看完 vs 跳过 百分比 |
| 三档人格分布 | 条形图 |
| 轮次漏斗 | 第 1/3/5/8/12/20 轮各有多少 session 到达 |
| 文本长度分布 | xs/s/m/l/xl 占比 |
| 错误分类 | auth/rate_limit/network/5xx/too_long/unknown |
| 每日日志 | 近 14 天（可切 7/14/30/60）· 11 列 · 等宽字体表 |

### 隐私边界（v0.7.9.1 延续）

- 只记 sessionId + 维度，**绝不记对话原文**
- 长度只记区间（xs/s/m/l/xl）
- sessionId 每 tab 一份，刷新即重置
- 所有数据 Upstash Redis 保留 ~1 年（UV set）/ 180 天（每日日志）/ 2 分钟（在线）

### Changed

- `package.json` — 新增 `@upstash/redis ^1.x`（替代 `@vercel/kv` 因官方已弃用）
- `lib/analytics.ts` — track() 双写逻辑 + 新增 `sendHeartbeat()` 导出
- `components/ChatShell.tsx` — 加 30s 心跳定时器 + visibilitychange 暂停优化
- `components/Chat.tsx` — EmptyState 引入 `<StatsBanner/>` 替换 LOADING IN PROGRESS
- `components/StatsBanner.tsx` — tooltip 改 `position: fixed` 定位（修复父容器 `overflow-y-auto` 裁切问题）
- `lib/stats/admin-auth.ts` — 后台 4 层鉴权：时间安全比较 / 速率限制 / IP 白名单 / 强制配置检查

### 部署前置任务（仅首次）

1. Vercel Dashboard → Marketplace → Upstash → Create Redis → 选 free tier
2. 集成后自动注入 `KV_REST_API_URL` / `KV_REST_API_TOKEN` 环境变量
3. Vercel → Settings → Environment Variables → 添加 `ADMIN_KEY = 强随机串 ≥16 位`
4. （可选·推荐）添加 `ADMIN_IP_ALLOWLIST = 你家/公司公网 IP`，只允许白名单 IP 访问后台
5. （可选·极严）添加 `ADMIN_STRICT = 1`，强制要求 key ≥16 位 AND IP 白名单必须配置
6. Push · Vercel 自动部署 · 完成

### 后台安全（v0.7.9.2 · 4 层防护）

> 为什么要 4 层 —— 单纯 `?key=XXX` 如果 URL 意外泄露 / 被爬虫扫到就危险了

| 层 | 机制 | 触发 |
|---|---|---|
| 1 | **强制配置检查** | `VERCEL_ENV=production` 且 `ADMIN_KEY` 未配置或为默认值 → 503，接口直接不工作 |
| 2 | **时间安全比较** | 防时序攻击（逐字符比较会因为返回时机泄露正确字符串长度）|
| 3 | **IP 白名单** | 配置 `ADMIN_IP_ALLOWLIST` 后，非白名单 IP → 403，连 key 比较都不走 |
| 4 | **速率限制** | 单 IP 每分钟 > 10 次访问 → 429，防暴破 |

对客户端**不暴露失败原因**（不说是密码错了还是 IP 不对还是没配置），只返回 HTTP 状态码，防爬虫侦察。

### 验证清单

- [ ] 本地 `npx next build` ✅
- [ ] tsc --noEmit ✅
- [ ] Upstash 集成后首次 `/api/stats/summary` 返回 `{totalVisitors: 0, ...}`
- [ ] 发一条消息 → 30s 后 `/api/stats/summary` 显示 `onlineNow: 1`
- [ ] `/admin?key=XXX` 显示 KV 状态灯 🟢 "已连接"
- [ ] 主页冷启文案显示"醒醒刚开张几天"

### 工时

- 实际花费 ~1h 40min（预估 1.5h，略超因为中途把 `@vercel/kv` 换成 `@upstash/redis`）
- 新增 8 个文件 +1,300 行 / 改 4 个文件 +80 行
- tsc 0 错误 / next build 成功 / 0 新 lint 警告

---

## [v0.7.9.1] - 2026-05-11 — 「最小埋点 · 让产品脱离黑盒」

> **Patch · 数据驱动启动** · 启用 Vercel Analytics 自定义事件
> 把"多少人在用 / 怎么用 / 用几轮"从黑盒变成可看的数据。
> 不记任何对话原文 — 只记事件 + 维度，符合隐私边界。

### Added · 9 个核心事件

新增 `lib/analytics.ts` — 统一埋点入口，基于 `@vercel/analytics/track`。

| 事件 | 触发时机 | 维度 |
|---|---|---|
| `intro_played` | 开场动画完整播完（用户看到底部按钮再点击） | `phase` |
| `intro_skipped` | 用户跳过开场（按钮/键盘/点空白） | `phase` |
| `session_started` | 第一次发出消息正式开聊 | `mode` |
| `session_cleared` | 点「清空重开」 | `mode`, `turn_count` |
| `mode_selected` | 切换人格档（仅未开始对话时） | `mode`, `from_mode` |
| `preset_tip_clicked` | 点 EmptyState 三档示例 tip 命中预制 | `mode` |
| `message_sent` | 发出一条消息（核心活跃指标） | `mode`, `turn_index`, `is_followup`, `length_bucket` |
| `followup_clicked` | 点「追问这一段」 | `mode`, `turn_index`, `anchor_len` |
| `api_error` | DeepSeek 调用失败 | `mode`, `turn_index`, `error_type` |

### 关键设计

- **session_id**：每个 tab 一份，存 `sessionStorage`，刷新即重置 — 串联同一次访问的所有事件
- **隐私边界**：消息只记 `length_bucket`（xs/s/m/l/xl），**绝不传原文**
- **错误分类**：`auth`/`rate_limit`/`network`/`5xx`/`too_long`/`unknown`，跟 `toFriendlyError` 一致
- **SSR 安全**：所有 `window`/`sessionStorage` 访问都加守卫，永远不抛错中断主流程
- **数据保留**：Vercel Hobby 免费版 = 1 天滚动窗口；Pro 版 = 30 天

### 看板路径

Vercel Dashboard → `xingxing-ink` 项目 → 顶部 `Analytics` tab → `Events` 子页

可看：
- 每个事件的总量 + 时间分布
- 维度过滤（按 `mode` / `turn_index` 切片）
- 漏斗：`intro_played` → `mode_selected` → `session_started` → `message_sent(turn_index>=3)` → `followup_clicked`

### Changed

- `components/ChatShell.tsx` — 包了一层 `handleModeChange` 拦截切换；`sendMessageWith` 加 4 处埋点
- `components/Chat.tsx` — `handleFollowUp` 加 1 处埋点
- `components/WakeUpIntro.tsx` — `finish()` 拆 `auto`/`skip` 两路埋点

### 验证清单（自测后做）

- [ ] 浏览器开 DevTools → Network → 看 `/_vercel/insights/event` 请求
- [ ] 触发 9 个事件各一次，看请求 payload 正确
- [ ] 24h 后回 Vercel Analytics → Events 看是否有数据

### 技术债

- v0.7.9.1 仅依赖 Vercel Analytics 内置，没自建后端
- 升级路径：v0.8 + 加 Supabase → 可看具体每个 session 的轨迹（要写隐私政策）

### 工时

- 实际花费 ~1h（远快于预估 1.5h，因为 `@vercel/analytics` 已经接好了，只补 `track` 调用）
- 改 4 个文件 共 +200 行 / -10 行
- tsc 0 错误 / 0 lint

---

## [v0.7.9] - 2026-05-11 — 「12 问动态 Picker · Token 再省 17%」

> **Minor 大版本** · 把全量方法论拆成「12 问独立文件」，按需注入。
> 第 6+ 轮 prompt 18K → 15K（-17%），全部进入 DeepSeek 最佳消化区。

### Added · 12 问动态注入架构

#### 私藏 repo（xingxing-ink-mind · commit 9086efc）

新增 49 个文件：
- `_methodology/_matrix_overview.md` — 12 问地图层（永远注入 · ~600 tokens）
- `_methodology/questions/Q1.md ~ Q12.md` — 单题详细弹药（~400 tokens/Q）
- `arsenal_addon/{casual,rational,scathing}_q/Q1.md ~ Q12.md` — 三档 × 12 题特色加密（~150 tokens/Q）
- `scripts/_gen_arsenal_q.mjs` — 36 文件批量生成器（迭代用）

#### 主 repo（开源骨架）

- `lib/prompts/q_picker.ts` — 关键词 + 递推 + **粘性 3 轮**算法
  - 词典：12 个 Q × ~10 个关键词
  - 算法：
    1. 检测当前消息 + 历史关键词 → 加权评分
    2. 推断上一题状态（哪个 Q + 第几把刀）
    3. 决策树：跳题信号 / 粘性继续 / 题挥完转下一题 / 兜底起手
  - 粘性铁律：开始攻 Qn 后强制连续 3 轮注入对应 Qn 弹药（除非用户明确跳题）
- `lib/prompts/methodology_loader.ts` 新增 3 个接口：
  - `loadMatrixOverview()`
  - `loadQuestionFile(qNumber)`
  - `loadArsenalAddonQ(mode, qNumber)`
- `lib/prompts/index.ts` `buildSystemPrompt`：
  - 接口扩展：新增可选 `recentHistory` 参数
  - 第 3+ 轮注入策略变更：从 `[matrix(8K) + arsenal_addon(5K)]` 改为 `[overview(0.6K) + Qn(0.4K) + addon_q(0.15K)]`
  - 在 overview 末尾追加"当前攻击点"标注，让醒醒清楚自己在哪
  - Fallback 兜底：新文件缺失时降级到 v0.7.8.2 全量加载
- `app/api/chat/stream/route.ts`：传入 `recentHistory`（最近 4 轮 user+assistant 对话）

### Performance

| 场景 | v0.7.8.2 | **v0.7.9** | 节省 |
|---|---|---|---|
| 第 1-2 轮 | ~10K tokens | ~11K tokens | +9% |
| 第 3 轮 | 15K | **12K** | -20% |
| 第 5 轮 | 17K | **15K** | -12% |
| 第 6+ 轮 | 18K | **15K** | -17% |

整体进入 DeepSeek 最佳消化区（≤15K tokens · 远离注意力衰减拐点）。

### Architecture（v0.7.4 → v0.7.9 演进）

```
v0.7.4：分层组装（core/persona/dynamic/arsenal）
v0.7.8：方法论层注入（matrix/diagnosis/protocol/arsenal_addon）
v0.7.8.1：结构铁律 + 首尾夹击
v0.7.8.2：方法论文件精简（双轨 · 运行时版 vs 人类版）
v0.7.9：方法论拆 12 问 + Q picker 动态注入 ⭐
```

### Risk & Fallback

- ✅ 旧文件 `_matrix_v1.md` / `arsenal_addon/{mode}.md` **仍保留**——picker 找不到新文件时自动降级
- ✅ 主 repo `buildSystemPrompt` 旧调用兼容（recentHistory 默认空数组）
- ✅ 缺失任何文件全部返回空字符串 · 主流程不阻断
- ⚠️ Picker 关键词命中率依赖词典质量（v1.1+ 可补充）
- ⚠️ 粘性 3 轮 vs 用户跳题信号的边界——picker 优先尊重用户跳题，但首字粘性可能错过用户隐式跳题

### Verified

- tsc 0 错误 + next build 成功 + 0 lint
- 健康检查 49 文件 0 缺失
- 真机验证待 mind repo redeploy 后做

---

## [v0.7.8.2] - 2026-05-11 — 「方法论文件精简 · Token 优化 27%」

> **Patch · 质量不掉 token 省 27%** · 把方法论文件砍到 LLM 最佳消化区间。

### Changed · 方法论文件双轨精简

xingxing-ink-mind private repo 更新（commit ee7f7fd）：

| 文件 | 原 | 现 | 节省 |
|---|---|---|---|
| `_matrix_v1.md` | 424 行 | 113 行 | -73% |
| `_diagnosis_template.md` | 276 行 | 94 行 | -66% |
| `_response_protocol.md` | 325 行 | 164 行 | -50% |
| `arsenal_addon/casual.md` | 125 行 | 103 行 | -18% |
| `arsenal_addon/rational.md` | 144 行 | 116 行 | -19% |
| `arsenal_addon/scathing.md` | 142 行 | 98 行 | -31% |

**双轨方案**：LLM 只读精简版；完整人类版备份到 `_full_*.md` 或 `_full/` 目录，供未来迭代参考。

### Performance · System Prompt Token 优化

| 场景 | v0.7.8.1 | **v0.7.8.2** | 节省 |
|---|---|---|---|
| 第 3 轮 | 19K tokens | **15K** | -21% |
| 第 5 轮 | 22K tokens | **16K** | -27% |
| 第 6+ 轮 | 22K tokens | **16K** | -27% |
| 全触发 | 25K tokens | **18K** | -28% |

**全部掉到 DeepSeek 注意力舒适区 (<18K tokens)**——首字延迟 -1.5s 预期，质量反而提升（长 prompt LLM 跳读的问题不再）。

### 砍掉的内容类型（人类版仍保留）

- 章节 0 总纲说明（LLM 不需要矩阵"为什么重要"）
- 章节 7 护城河声明（是给人类看的营销话术）
- 章节 6 使用心法（部分已被 `_response_structure.md` 覆盖）
- v0.8.0 接口预留（LLM 不感知 UI）
- 每条追问的"关键设计+反例"注解（LLM 只需要范本话术）
- 实战 3 轮完整示例（重复性示例）

### 无变化

- 运行时行为与 v0.7.8.1 完全一致（methodology_loader 不动）
- 所有弹药原文话术零删减（只砍元说明文字）

---

## [v0.7.8.1] - 2026-05-11 — 「结构铁律强化 · 首尾夹击法」

> **Patch** · 修复 v0.7.8 首发后真机测试发现的 2 个铁律失守。

### Fixed
- 结构铁律失守：一轮挥 3 把刀（违反"3 轮挥完一题"）/ 末尾缺编号 forced choice
- 根因：方法论层（matrix+arsenal_addon）在 prompt 中间挤占了 LLM 对 70/20/10 结构的注意力

### Changed
- `lib/prompts/index.ts` loadFinalReminder 强化：新增"结构铁律"分组（优先级最高 · 3 条）+ 原内容铁律降级
- `_response_structure.md` 注入位置：3.5 位 → final_reminder 前（首尾夹击法）
- 末尾明确"A/B/C 编号"forced choice 规定，"说吧你卡在哪"开放问句不算

### Verified
- scathing 档真机测试：70% diss + 单刀追问 + A/B/C 编号 + 6 竞品 + 4 数字全部达标

---

## [v0.7.8] - 2026-05-11 — 「醒醒方法论矩阵 v1.0 · 五维融合 · 私藏架构 · 诊断师人格」

> **大版本** · 把醒醒从「毒舌聊天 AI」升级为「带方法论的诊断师」。
> 核心引入 BMC × PRD × JTBD × AARRR × Hooked × 心理三连五维融合矩阵，配套 70/20/10 单轮回复结构铁律 + 「3 轮挥完一题」节奏 + 「答不出来 SOP 三档差异化」+ 「醒醒诊断书 MVP 心法埋点」。同时落地骨架开源 + 弹药库私藏的混合安全架构。

### Added · 五维融合方法论矩阵 v1.0（私藏 · 核心护城河）

新建 `xingxing-ink-mind` private repo，本地 symlink 到 `lib/prompts/_methodology/` 和 `lib/prompts/arsenal_addon/`。

- **`_methodology/_matrix_v1.md`**（424 行）—— 12 大商业本质问题，分 3 个 Block：
  - Block 1 商业逻辑层（Q1-Q8）：为谁做 / 解决什么真痛 / 凭什么是你 / 用户怎么找到你 / 用户为什么留下 / 怎么收钱 / 成本结构 / 靠谁兜底
  - Block 2 产品落地层（Q9-Q11）：MVP / 用户旅程 / 数据飞轮
  - Block 3 创始人体检层（Q12 心理三连）：动机 / 止损 / 机会成本
  - 每个本质问题用 2-3 个方法论交叉校验
  - 三档主攻区分配（不互斥）：casual 戳人性脆弱、rational 数字逻辑碾压、scathing 见血封喉
- **`_methodology/_diagnosis_template.md`**（276 行）—— 醒醒诊断书三章 + 进度条（X/12）+ 醒醒裁决书 + 下次聊建议四件套模板，三档差异化裁决书风格
- **`_methodology/_response_protocol.md`**（325 行）—— 答不出来 SOP 决策树 + 三档差异化范本：
  - casual 轻巧版（"啧——又一个'没想过'。行吧，姐先记着..."）
  - rational 轻巧版（"嗯。Q4 我先标着——我们换个问题问..."）
  - **scathing 毒蛇重版**（"'没想过'——我听过太多人说这三个字...我不浪费时间在不存在的答案上。下一题——"）
  - 连续 2 题答不出来 → 升级停聊（三档差异化送客 + 召回钩子）
  - 模糊答案处理 + 答非所问处理
  - 反 PUA 红线四条
- **`_methodology/_methodology_history.md`**（83 行）—— 迭代日志，v1.1+ 计划注入 YC office hour / Christensen 颠覆理论 / 虫二先生公众号复盘金句
- **`arsenal_addon/{casual,rational,scathing}.md`**（共 411 行 · ~110 条主攻区毒蛇追问）

### Added · 单轮回复结构铁律 v2.0（70/20/10）· 开源

新建 `lib/prompts/dynamic/_response_structure.md`（111 行）：
- 70% 大段 diss 正文（基于本轮挥的那把刀的方法论视角）
- 20% 追问出刀（一轮 1 把刀，不一次挥 3 把）
- 10% forced choice（2-3 个编号选项 · 沿用 v0.6.0 现有铁律）
- rational/scathing 完全禁止虚认同语气词作为开场
- casual"随便聊"首轮可加 1 句"听着挺美"缓冲

### Added · 「3 轮挥完一题」节奏铁律 + 诊断书心法埋点

`dynamic/turn_3_5.md` 末尾追加：
- 一题 3 把刀分 3 轮挥完铁律（同题不连续 2 轮重复 / 第 4 轮才换下一题）
- 选题策略（按用户画像选起手 Q）
- 心智账本（醒醒每轮回复时心里维护"已挥刀"进度表）
- 单题答不出来三档差异化处理桥接

`dynamic/turn_6_plus.md` 末尾追加：
- 诊断书心法埋点（5+ 轮主动给"下次聊建议"）
- 三档差异化下次聊建议范本（casual 暖心 / rational 专业咨询师 / scathing 毒蛇但留情）
- 反鸡汤红线（禁"加油" / "我等你"那种空召回）

### Added · 三档 persona/*_core.md 末尾 v0.7.8 章节

每档追加：
- 单轮回复结构铁律呼应
- 答不出来 SOP 三档差异化（casual/rational 轻巧 · scathing 毒蛇重版）
- 主攻区与心智账本

#### casual_core.md（嫌弃毛刺补强）
- 嫌弃口头禅加密：「啧」「行吧」「姐告诉你」「你还真敢」「就这？」「醒醒」
- 反激将：「这个简单的你总能答吧？」
- 现实碾压（首轮黄金公式新增）：戳完痛点必举 1 个真实竞品/数字给用户看差距

#### rational_core.md（御姐气场补强）
- 加回「敢沉默」示例（「（停顿）」「（沉默）」明示）
- 「逼实锤名单」（所有定性词逼成定量 / 实名 / 过程）
- **字数下限 350 字**（御姐不说短话）
- 专业术语直接用不解释（CAC / LTV / D7 / 北极星 / Churn / NPS / Unit Economics）
- 冷静开场词：「嗯。」「讲完了？」「说。」

#### scathing_core.md（毒蛇但反 PUA）
- 标志性句式加密：揭动机 / 揭悖论 / 揭老底 / 俗比 / 见血
- 答不出来 SOP **保留毒蛇重版**（不软化 · 不安慰 · 不留台阶）
- 反 PUA 红线四条（不攻击人格 / 不嘲笑能力 / 不诅咒未来 / 不羞辱回家）
- 核心：毒蛇是攻击逻辑漏洞，PUA 是攻击人本身——醒醒只做前者

### Added · methodology_loader.ts（开源调用器骨架）

新建 `lib/prompts/methodology_loader.ts`：
- 暴露 5 个接口：`loadMethodology()` / `loadDiagnosisTemplate()` / `loadResponseProtocol(mode)` / `loadArsenalAddon(mode)` / `loadResponseStructure()`
- 缺失文件全部返回空字符串（保底兜底，主流程不阻塞）
- 独立缓存（不污染 index.ts 的 fileCache）
- `checkMethodologyHealth()` dev 调试接口

### Added · 按需注入策略（关键性能优化）

`index.ts buildSystemPrompt` 改为分轮次按需注入，避免 25K+ tokens 注意力衰减：

| 场景 | 注入内容 | 长度 |
|---|---|---|
| 第 1-2 轮 · 正常 | 原 v0.7.7 + 70/20/10 结构 | ~17K chars / ~10K tokens |
| 第 3-5 轮 · 正常 | + matrix + arsenal_addon | ~32K chars / ~19K tokens |
| 任意轮 · trigger 命中 | + response_protocol（5K）| 命中"不知道"/"没想过"/"大概"等 5+ trigger 词时叠加 |
| 第 6+ 轮 · 正常 | + diagnosis_template | ~37K chars / ~22K tokens |

对比改前的 25K tokens 全注入，**第 1-2 轮性能基本同 v0.7.7**，第 3+ 轮才进入完整方法论态。

### Added · 骨架开源 + 弹药库私藏（混合安全架构）

- 主 repo `xingxing-ink` 仍开源（人格骨架 + 调用器接口 + 5 维矩阵骨架描述）
- 私藏 `xingxing-ink-mind` private repo（核心方法论实体 + 三档主攻区毒蛇追问）
- 本地 dev：手动 git clone xingxing-ink-mind 到 sibling 目录 + symlink
- Vercel 生产：`vercel.json` buildCommand 改为 `bash scripts/fetch-mind-repo.sh && next build`，用 `MIND_REPO_TOKEN` 环境变量做 GitHub PAT 拉 private repo + symlink + next build
- `scripts/fetch-mind-repo.sh` 脚本带 fallback：token 未设置时跳过私藏拉取，主流程仍可工作（弱化为 v0.7.7 行为）
- `.gitignore` 新增 `lib/prompts/_methodology/` 和 `lib/prompts/arsenal_addon/`（symlink 不进开源）

### Changed · 不变红线（v0.7.4 架构 + 现有功能完整保留）

- ✅ v0.7.4 分层架构：core / persona / dynamic / arsenal 完全保留
- ✅ v0.7.5 / v0.7.6 / v0.7.7 现有 stripStageDirections 后处理完全保留
- ✅ 现有线上功能：首轮黄金公式、情感兜底、9 条预制开场、TTS、人像呼吸、麦克风长按 全部零回归
- ✅ 醒醒名字、三档 label/subtitle/description 不动
- ✅ scathing 档 8/8 通过的核心人格只追加，不重写
- ✅ `index.ts` buildSystemPrompt 主签名不变
- ✅ `arsenal_picker.ts` 完全不动（按行业触发词命中保持原样；arsenal_addon 走独立 loader）
- ✅ core/ 5 个铁律文件零修改

### Migration Notes（部署到生产）

主 repo 推送 main 后，**Vercel 自动部署会成功**——但首次部署方法论层会**为空**（fallback 模式 = v0.7.7 行为）。

要让 v0.7.8 完整生效，需要 3 步手工动作（用户后续完成）：
1. 在 GitHub 创建 `xingxing-ink-mind` private repo（用户名 `mansonli001`）
2. 把本地 `../xingxing-ink-mind` 推送到该 repo
3. 在 Vercel project 设置里加环境变量 `MIND_REPO_TOKEN`（GitHub PAT，repo 读权限）

完成 3 步后，下次 Vercel build 自动拉私藏 repo + symlink + next build → 五维矩阵完整生效。

### Risk Assessment

- 🟢 主 repo 改动：tsc 0 错误，build 成功，所有现有功能保留
- 🟢 private repo fallback：缺失全部返回空字符串，主流程不中断
- 🟡 system prompt 长度：第 6+ 轮 22K tokens，DeepSeek 上下文够用但接近注意力衰减拐点（按需注入已最大限度优化）
- 🟢 三档真机回归：依赖 private repo + Vercel token 配置完成后做（用户负责）

---

## [v0.7.7] - 2026-05-10 — 「修复 · 追问标记漏出到用户气泡 + 锚点 markdown 清理」

> 一句话总结：v0.7.3 的「追问这一段」一键直发，前端把 `__FOLLOWUP__|anchor|utterance` 整串既当 API payload 又当用户气泡内容渲染，结果用户看到一大坨 `__FOLLOWUP__|**一句话告诉我...|就你刚才说的「**一句话告诉我...」——再深挖一层` 垃圾标记。同时锚点里夹着 markdown `**加粗**` 符号也没清理。v0.7.7 在 `ChatShell.sendMessageWith` 里拆包：API 用完整 payload（后端识别），气泡和 state 只存自然话术。`MessageBubble.handleQuote` 抽锚点前清掉 md 符号。

### 翻车截图（用户反馈）

用户气泡赫然显示：

```
__FOLLOWUP__|**一句话告诉我：你比梁文锋多懂什么？|就你
刚才说的「**一句话告诉我：你比梁文锋多懂什么？」——再
深挖一层、别换话题、别重复你说过的话。
```

**两个叠加 bug**：

1. **内部标记漏出**：`__FOLLOWUP__|` 和中间分隔符 `|` 作为 protocol marker，本该只给后端看，被直接当 text 渲染
2. **Markdown 漏出**：锚点里的 `**` 加粗符号没清理，气泡里用户看到 `「**一句话...」` 视觉很脏

### Fixed 1 —— `ChatShell.sendMessageWith` 拆包 payload

文件：`components/ChatShell.tsx`

新增 `apiText` / `displayText` 分离：

```ts
const apiText = text;              // 发后端用，保留 __FOLLOWUP__ 标记
let displayText = text;            // 渲染气泡 + 写入 state 用，只要自然话术
if (text.startsWith("__FOLLOWUP__|")) {
  const rest = text.slice("__FOLLOWUP__|".length);
  const sepIdx = rest.indexOf("|");
  if (sepIdx > 0) {
    displayText = rest.slice(sepIdx + 1).trim() || text;
  }
}
```

然后：
- `userMsg.content = displayText`（两处：preset 分支 + 主分支）
- `body.message = apiText`（送后端保留完整标记）

这样后端仍能识别追问模式走 DIRECTOR_NOTE，用户只看到干净的自然话术。

### Fixed 2 —— `MessageBubble.handleQuote` 锚点 markdown 清理

文件：`components/MessageBubble.tsx`

在选出锚点句后，截断前加一层 markdown 清理：

```ts
anchor = anchor
  .replace(/\*\*([^*]+)\*\*/g, "$1")  // **bold** → bold
  .replace(/\*([^*]+)\*/g, "$1")       // *italic* → italic
  .replace(/`([^`]+)`/g, "$1")         // `code` → code
  .replace(/^#+\s*/g, "")              // ### 标题 → 标题
  .replace(/^>\s*/g, "")               // > 引用 → 引用
  .replace(/[\[\]「」""]/g, "")        // 去掉会和话术模板冲突的成对引号
  .replace(/\s+/g, " ")                // 多空格合并
  .trim();
```

核心是**去掉会和自然话术模板 `就你刚才说的「...」` 冲突的引号**——如果锚点本身带 `「」` 或 `""`，拼进模板后会嵌套混乱。

### 不动的（架构红线保留）

- ✅ v0.7.3 追问一键直发的 `__FOLLOWUP__|anchor|utterance` protocol 不变（后端仍在用）
- ✅ v0.7.4 分层 prompt 架构完全保留
- ✅ v0.7.5 / v0.7.6 三档铁律和 stripStageDirections 完全保留
- ✅ `sendMessageWith` 对外签名不变（仍收单字符串，内部拆包）
- ✅ `MessageBubble` 锚点优先级（最后问句 → 最短问句 → 第一句）不变

### 风险评估

极低 —— 纯前端渲染层修复，不涉及后端协议、不涉及 prompt、不涉及 session 存储。tsc 0 错误。

---

## [v0.7.6] - 2026-05-10 — 「代码层兜底 · 舞台指示后置过滤器」

> 一句话总结：v0.7.5 铁律 0 三连迭代（v0.7.1 → v0.7.5）都没能彻底堵住 DeepSeek 在 casual 档输出 `（把咖啡杯往桌上一搁，挑眉看你）` 这类舞台指示——**模型对"嫌弃小妹"的风格先验太强，纯 prompt 压不住**。v0.7.6 在 stream 层加代码兜底：按行缓冲 + 正则扫 + 只对"独立出现的短舞台指示"下手。真机首轮验证彻底消除。

### 根因

即使 prompt 明确列举 `（笑了一声）/（翻白眼）/（敲桌子）` 作为反例，DeepSeek 仍会变着花样输出 `（眼神一抬，嘴角带点看热闹的笑）`——训练数据里"嫌弃小妹"类角色 99% 带动作描写，**模型风格先验比 prompt 指令权重高**。

**结论**：纯 prompt 防不住。必须代码层加后置过滤。

### Fixed —— stream 层 stripStageDirections

`app/api/chat/stream/route.ts` 新增后置过滤：

**策略（保守为主，不误伤正常内容）**：
1. **按行缓冲**——遇 `\n` 才 flush，避免跨 chunk 正则切碎正常内容
2. **只扫行首独立出现**的舞台指示（段首紧跟的也算）
3. **只对 ≤ 40 字的短动作描写**出手（保护长引用、法规条款）
4. **覆盖中英文括号**：`（）`、`()`、`【】`、`[]`
5. **用户嵌套引号不误伤**：`用户说「（我觉得）这个好」` 保留
6. **段内嵌入合理括号不误伤**：`医疗类涉及（含医学证据）的审查` 保留

**单测 8 组 case 全通过**。

### 真机验证（v0.7.6 上线后）

用户输入："今天突然想做个陪伴类 AI"

AI 回复（0 舞台指示，直击 idea）：
```
哦？怎么突然想做这个，是看别人做 AI 女友男友赚钱眼红了，还是真觉得这块市场有缺口？

给你两个选择，你选哪个动机：
A. 钱景好，想分一杯羹
B. 真心觉得孤独的人需要陪伴

说真的，要是选 A，我劝你趁早打住。现在这赛道卷成什么样你知道吗？
Character.AI 免费，Replika 一年才 69.99 美金，你打算卖多少钱？99 一个月？
比 ChatGPT Plus 还贵，你是往里镶了钻还是装了 GPT-5？
```

**验收 8 项初步全过**：
- ✅ 零舞台指示（v0.7.6 过滤器生效）
- ✅ 零幻觉（没编用户背景）
- ✅ 首轮直击 idea（问动机 + 甩 3 个真实竞品）
- ✅ 带选项的 forced choice（A vs B + 价格区间 2 选 1）
- ✅ 弹药库 A5 陪聊类自动命中（Character.AI/Replika/ChatGPT Plus/69.99 美金）
- ✅ 嫌弃小妹人格保留（"眼红了""劝你趁早打住""镶了钻还是装了 GPT-5"）

### 不动的

- ✅ v0.7.4 分层 prompt 架构（core/persona/dynamic）完全保留
- ✅ v0.7.5 prompt 层铁律保留作第一道防线（即使 LLM 漏网也靠代码兜底）
- ✅ arsenal_picker / buildSystemPrompt 接口不动

### 风险

极低——纯字符串后处理，保守正则（只扫 ≤ 40 字的行首括号），单测全通过。

### 今日版本节奏（一天 7 推）

```
v0.6.1 微信头像按钮 + 文案微调          (b726575)
v0.7.0 反套路化（非线性追问+轮次种子）    (b2b96cf)
v0.7.1 hotfix 元话语泄漏                (61da222)
v0.7.2 hotfix 永不丢失产品锚点          (10a6a84)
v0.7.3 hotfix 追问这一段死循环          (740b756)
v0.7.4 架构重构 · Prompt 分层动态组装    (391873e)
v0.7.5 hotfix v0.7.4 残留 3 项          (0c1d1e3)
v0.7.6 代码层兜底舞台指示过滤           (056a513) ← 当前线上
```

---

## [v0.7.5] - 2026-05-10 — 「修复 · v0.7.4 真机回归残留 3 项（舞台指示/用户背景幻觉/forced choice 偷懒）」

> 一句话总结：v0.7.4 架构重构上线后真机跑首轮，发现 3 个残留 bug。v0.7.5 堵死——铁律 0 新增「圆括号舞台指示禁用」、铁律 2 新增「用户背景禁止推测」、铁律 4 新增「数量不够必须重写」硬约束。

### v0.7.4 真机首轮实测问题

用户输入："今天突然想做个陪伴类 AI"

AI 首轮回复：
```
（笑了一声，靠在椅背上）

哦？你今天心情不错啊，终于从那些冷冰冰的 SaaS 里走出来，想做点"有温度"的东西了？

行啊，那我先问问你——你理想中的"陪伴类 AI"长什么样？是像 Replika 那种能当虚拟男友/女友的，还是像 Pi 那样像朋友一样聊天的，还是想做那种功能型陪伴，比如陪老人唠嗑、陪小孩写作业？
```

**3 个 bug**：

1. ❌ **舞台指示泄漏**："（笑了一声，靠在椅背上）"——v0.7.1 的铁律 0 只禁了**方括号** `[XXX]`，没防圆括号 `（动作旁白）`
2. ❌ **用户背景幻觉**："你今天心情不错""你终于从冷冰冰的 SaaS 里走出来"——用户完全没说过心情/职业，AI 自己编的
3. ❌ **forced choice 数量偷懒**：首轮只给 1 个带选项反问（Replika / Pi / 功能型），没有第 2 个——违反铁律 4 下限

### Fixed 1：铁律 0 禁圆括号舞台指示

`core/00_output_rules.md` 扩充禁止清单：

```
❌ 任何方括号 / 圆括号 包裹的舞台指示 / 旁白 / 动作描写
  - （笑了一声，靠在椅背上）❌
  - （翻白眼）❌
  - （敲了敲桌子）❌
  - 这不是剧本，是对话。醒醒的情绪通过词汇和语气传达，不靠动作旁白
```

### Fixed 2：铁律 2 禁用户背景推测

`core/02_no_hallucination.md` 新增明确列举：

```
❌ 给用户贴他没声明过的背景 / 身份 / 处境

例子：用户只说"今天想做个陪伴类 AI" → 你不能说：
- "你今天心情不错啊" ❌（用户没说心情）
- "你终于从冷冰冰的 SaaS 里走出来" ❌（用户没说自己做过 SaaS）
- "你白天是不是又憋了一肚子话" ❌（用户没说自己在上班）
- "你这个 AI 工程师想做点有温度的" ❌（用户没说自己是工程师）

用户只说了 10 个字 ≠ 你知道他的前后经历
想知道背景？问用户。不问就不假设。
```

### Fixed 3：铁律 4 硬化数量下限

`core/04_forced_choice.md` 末尾新增：

```
低于下限 = 没完成任务 = 必须重写这一轮

回复前自检（必做）：
1. 我这段话里有几个带选项的反问？
2. 少于下限？→ 加到够
3. 下限够了但选项不具体（"大市场 vs 小市场"这种）？→ 换成具体画像

只给 1 个 forced choice 就收尾 = 偷懒 = 重写
```

### Fixed 4：最终提醒同步强化

`index.ts` 的 `loadFinalReminder()` 扩写：
- 第 1 条加舞台指示禁令明例
- 第 3 条扩展为"形态/背景/身份"三重禁止 + 举具体错例
- 第 4 条加"数一数"自检动作

### 不动的（v0.7.4 架构保留）

- ✅ 分层目录结构（core/persona/dynamic）不动
- ✅ arsenal_picker 不动
- ✅ buildSystemPrompt 接口不动
- ✅ 三档 persona 人设+2 示例全保留

### 风险评估

低风险——纯 prompt 层细节补丁，无代码逻辑改动。tsc 0 错误。

---

## [v0.7.4] - 2026-05-10 — 「架构重构 · Prompt 分层动态组装（对齐 toxic-pm 基本功）」

> 一句话总结：v0.7.3 暴露了 LLM 在 700 行单体 prompt 下的系统性退化——**幻觉用户没说过的 idea、问同一个问题 2 次、8 轮追问一直在挖用户老底不挖 idea 本体**。对标 toxic-pm 实测 8 轮 0 翻车的基本功，v0.7.4 把 500 行三档 prompt **彻底重构为分层动态组装架构**：core 铁律（永在） + persona 骨架（每档砍到 150 行） + dynamic 轮次切片（按第几轮注入不同片段） + arsenal picker（按关键词命中抽 1-2 条弹药，不再全推 202 行）。system prompt 总长从 ~790 行砍到 ~520 行，首尾双保险对抗注意力衰减。

### 翻车背景（v0.7.3 8 轮实测）

```
用户："今天突然想做个陪伴类 AI"
醒醒（第 1 轮）："你朋友圈 20 赞都没有" ← 首轮就挖老底，不攻 idea 本体
醒醒（第 7 轮）："你那个「帮大学生找对象的 App」" ← 凭空幻觉用户没说过的形态
醒醒（第 2、7、8 轮）"你上次付费是啥时候" ← 同一问题反复问
用户 第 7 轮："我焦虑" → 醒醒：让用户去喝水睡觉 ← 丢了产品锚点触发兜底
```

**根因**：700 行 system prompt 超过 DeepSeek 注意力边界——首尾铁律记不住，中段弹药库被当成"通用模板"直接套用，`history` 长到 10+ 条后开始混淆真实用户输入和弹药库示例。

### toxic-pm 逆向观察（Phase 0）

同样 8 轮输入，toxic-pm 三档全部 **0 翻车**：
- 首轮直击 idea（问"陪谁"+"vs Character.AI 差在哪"）
- 8 轮全程无幻觉（锁死"陪伴类 AI"原词）
- 每轮至少 2 个带选项 forced choice
- 用户说"焦虑" → 立刻拆成职场/搞钱/婚恋三档（不兜底不共情）
- 用户第 8 轮绕话题 → 直接 callback 具体词拉回

见 artifact `toxic-pm_逆向观察报告_v1.md` + `v0.7.4_架构重构_plan.md`。

---

## Added —— 新目录结构

```
lib/prompts/
├── core/                          ← 5 条硬铁律（永在 · 首位高权重）
│   ├── 00_output_rules.md         ← 铁律 0：永不输出元话语（34 行，继承 v0.7.1）
│   ├── 01_product_anchor.md       ← 铁律 1：永不丢产品锚点 + 三优先级判定（59 行，继承 v0.7.2）
│   ├── 02_no_hallucination.md     ← 铁律 2：永不幻觉用户未说过的话【🆕】（42 行）
│   ├── 03_idea_first.md           ← 铁律 3：前 3 轮必须锚定 idea 本体【🆕】（70 行）
│   └── 04_forced_choice.md        ← 铁律 4：每轮 ≥ 2 个带选项反问【🆕】（57 行）
│
├── persona/                       ← 三档人格骨架（每档 ~150 行，砍薄版）
│   ├── casual_core.md             ← 158 行（人设+三招牌+情感兜底前置门禁+2 示例）
│   ├── rational_core.md           ← 149 行
│   └── scathing_core.md           ← 146 行
│
├── dynamic/                       ← 按轮次动态注入【🆕】
│   ├── turn_1_2.md                ← 开场（58 行）：直击 idea + 两 forced choice
│   ├── turn_3_5.md                ← 深入（51 行）：槽点/竞品/留存/商业模式
│   └── turn_6_plus.md             ← 收官（94 行）：用户故事具体到秒+callback 具体词
│
├── _arsenal.md                    ← 保留 203 行（不动）
├── arsenal_picker.ts              ← 🆕 关键词命中抽条
├── index.ts                       ← 🆕 重写 buildSystemPrompt(mode, turnCount, userMessage)
│
└── _archive_v0.7.3/               ← 归档旧三档 prompt 作为历史参考
    ├── casual.md (587 行)
    ├── rational.md (585 行)
    └── scathing.md (632 行)
```

### 3 条新增铁律详细

#### 🆕 铁律 2：永不幻觉用户未说过的话

直指 v0.7.3 最痛的 bug——**AI 从弹药库"借"场景塞给用户**。

```
用户说"陪伴类 AI" → 就是"陪伴类 AI"
绝对禁止自动加料变成：
  ❌ "帮大学生找对象的 App"
  ❌ "给程序员找女朋友"
  ❌ "宠物社交产品"

唯一正确的扩展方式：给选项让用户选，不是替他决定
  ✅ 用户说"陪伴" → "陪谁：都市白领 / 二次元中学生 / 空巢老人——选一个"
```

#### 🆕 铁律 3：前 3 轮必须锚定 idea 本体

直指 v0.7.3 首轮就挖老底的毛病。

```
前 3 轮至少 2 轮必须直接攻击 idea 本身（目标用户/竞品/核心价值/技术壁垒/商业模式五选三）

揭老底招牌（朋友圈赞/你付过钱吗）前 3 轮最多用 1 次——用完立刻回 idea

反例：首轮就问"你朋友圈 20 赞都没有"——错！
正确：首轮问"陪谁：都市白领/二次元/空巢老人——选一个" + "vs Character.AI 差在哪"
```

#### 🆕 铁律 4：每轮 ≥ 2 个带选项的 forced choice

直指 v0.7.3 回复里出现"你考虑过吗""你想过差异化吗"这种无选项废问。

```
✅ 正确："职场焦虑 / 搞钱焦虑 / 婚恋焦虑——你做哪种"
✅ 正确："你做'药'（解决问题）还是'酒'（发泄情绪）"
❌ 禁止："你想过差异化吗" / "你有没有调研过"

档位下限：rational ≥ 3 / scathing ≥ 2 / casual ≥ 2
```

### Dynamic 按轮次注入（核心架构创新）

```typescript
// index.ts 核心逻辑
function loadDynamic(userTurnCount: number): string {
  if (userTurnCount <= 2) return loadFile("dynamic/turn_1_2.md");    // 开场攻 idea
  if (userTurnCount <= 5) return loadFile("dynamic/turn_3_5.md");    // 深入商业底
  return loadFile("dynamic/turn_6_plus.md");                          // 收官要故事
}
```

**每轮 prompt 不一样**——反套路化天然内建。

### Arsenal Picker 智能抽条

```typescript
// arsenal_picker.ts
// 按用户 idea 的关键词命中 A1-A10 段，抽前 2 条注入
pickArsenal("今天突然想做个陪伴类 AI") → 命中 A5（陪聊类）
pickArsenal("我想做帮 HR 筛简历的工具") → 命中 A1（招聘类）
pickArsenal("我想开个咖啡店") → 无命中，返回空（不硬塞）
```

**无命中不注入**——宁可短，不编。

---

## Changed —— `index.ts` 重写

- 导出新 `buildSystemPrompt(mode, userTurnCount, userMessage, historySummary?)`
- 旧 `loadSystemPrompt(mode)` 标记 `@deprecated` 保留兼容
- `route.ts` 改调用 `buildSystemPrompt`，传入计算好的 `userTurnCount = floor(history.length / 2) + 1` + 最近 3 轮历史摘要

---

## Prompt 长度对比

| 版本 | system prompt 总长 |
|---|---|
| v0.7.3 | ~790 行（casual 587 + arsenal 203 + 动态 hint） |
| **v0.7.4** | **~520 行**（core 262 + persona 150 + dynamic 50-90 + arsenal 按需 ~50） |

**砍 33%** · 同时每轮 prompt 不一样，首尾夹击铁律

---

## 不动的（红线保留）

- ✅ 三档 label/subtitle/description 完全保留（"随便聊"/"讲道理"/"扇巴掌" + 三句 slogan）
- ✅ `_arsenal.md` 内容不动（A1-A10 段）
- ✅ 弹药库**不被禁用**——只是从 full-prepend 改为 按需 pick
- ✅ 9 条预制开场 / TTS / 麦克风 / 人像呼吸 全部零回归
- ✅ v0.7.0 轮次种子 / v0.7.2 兜底前置门禁 / v0.7.3 追问一键直发 全部保留
- ✅ 旧三档 `.md` 归档到 `_archive_v0.7.3/` 作为历史参考

---

## 验收标准（上线后必须过 8 项）

用 Phase 0 同一组输入序列重跑：

- V1 零幻觉：不冒出"帮大学生找对象 App"等用户未说过的形态
- V2 零循环：同一追问（付费/朋友圈赞）不出现 ≥ 2 次
- V3 首轮直击 idea：第 1 轮必须包含"目标用户具体化"+"vs 竞品差异化"
- V4 每轮 ≥ 2 个 forced choice：无"你有没有想过"类无选项废问
- V5 情绪词被拆解：用户说"焦虑"→ AI 拆职场/搞钱/婚恋 3 子类
- V6 三档人格保留：casual 仍是"嫌弃小妹"不是"毒舌御姐"
- V7 绕话题 callback 具体词："刚才说 X，一转眼变 Y"
- V8 幻觉短答词修正：用户说"我第一次"不再误判成"第一次用 AI"

**8 项全过 → 通过；失败 ≤ 2 项 → 打补丁；失败 ≥ 3 项 → 回滚 v0.7.3**

---

## 风险评估

中等风险——架构级重构而不是小补丁：
- Prompt 拆分后**人格保真度可能衰减**（已通过每档保留 2 示例 + 首轮黄金公式+三招牌骨架来对冲）
- Arsenal picker 命中不准时**可能没有硬通货**（无命中时降级为纯 core+persona，不影响主功能）

**回滚路径**：git revert + 把 `_archive_v0.7.3/` 里的旧 .md 搬回原位，切换 `index.ts` 到 `loadSystemPrompt`

---

## [v0.7.3] - 2026-05-10 — 「修复 ·「追问这一段」死循环（一键直发重做）」

> 一句话总结：原「追问这一段」按钮实际实现是"截 AI 第一句塞输入框等用户继续打字"，但文案和交互让用户以为"点了就自动追问"，直接按发送 → AI 收到自己上条回复的开头当作用户输入 → 又生成类似回复 → 再点 → **死循环**。v0.7.3 改为**一键直发**：点击即构造自然话术 + 后端注入 DIRECTOR_NOTE 让 AI 针对锚点再深挖一层，禁止重复、禁止跑题。

### 翻车现场（用户截图复盘）

```
醒醒（上条回复开头）：「噗——不好意思，刚喝的咖啡喷屏幕上了。」
用户点击「追问这一段」→ 输入框被塞入：「> 噗——不好意思，刚喝的咖啡喷屏幕上了。」
用户按送出 → AI 收到「用户说：噗——不好意思……」→ 顺着生成新回复（又以「噗——不好意思……」开头）
用户再点「追问这一段」→ 重复上述流程 → 死循环
```

### 根因（双重 bug）

1. **锚点逻辑错**：`MessageBubble.handleQuote` 只取 `sentences[0]`——第一句往往是醒醒的开场语气词（"噗——""哎哟""啧"），**不是真正值得追问的核心句**
2. **交互语义错配**：按钮叫「追问这一段」，但实际实现是"塞输入框等你继续写"——用户本能以为点了就自动追问，直接发送 → **空追问把 AI 自己的话当用户输入回传**

### Fixed —— 前端改为「一键直发」

文件：`components/MessageBubble.tsx` + `components/Chat.tsx`

#### 锚点提取升级（3 级降级）

`MessageBubble.handleQuote` 重写：

```
优先级 1：最后一句带问号的（通常是收尾 forced choice，最值得追）
优先级 2：带问号的最短句（核心反问）
降级：第一句（最后兜底）
```

锚点最多 60 字，超出截断加「…」。

#### 一键直发流程

`Chat.tsx` `handleQuoteReply` → 重命名 `handleFollowUp`：

```ts
async function handleFollowUp(anchor: string) {
  if (streaming) return;
  const utterance = `就你刚才说的「${anchor}」——再深挖一层，别换话题、别重复你说过的话。`;
  const payload = `__FOLLOWUP__|${anchor}|${utterance}`;
  await sendMessageWith(payload);   // 直接发送，不经输入框
}
```

点击按钮立即发出一条**自然话术**的用户消息，完全不经过输入框——**彻底消除"用户误按发送"的路径**。

### Fixed —— 后端检测追问 + 注入 DIRECTOR_NOTE

文件：`app/api/chat/stream/route.ts`

新增 `parseFollowUp(raw)`：

- 识别 `__FOLLOWUP__|anchor|utterance` 格式
- 拆出锚点（给 AI 深挖用）和自然话术（写进 history 给用户看）
- 如果没有标记前缀，返回 null 走普通消息流程

新增 `buildFollowUpHint(anchor, modeId)` 注入 DIRECTOR_NOTE：

```
用户刚刚点击了你上一条回复里的「追问这一段」按钮，
被点击的锚点是：「{anchor}」

⚠️ 重要区分：这个锚点是你自己上一条说的话，不是用户新抛出来的 idea。
用户是在要求你针对这句话再深挖一层，不是让你复述它。

⛔ 强制规则：
- 绝不重复上一条回复里已经说过的话（包括这个锚点本身）
- 绝不跑题开新话题——必须紧扣这个锚点
- 绝不把锚点句当成用户说的话去回应（比如又说"你要做下一个 DeepSeek？"开头——那是你自己上条说过的）
- 换一个角度、换一个招牌动作，把这个锚点再往深处捅 1-2 层
- 回复末尾至少留一个新的具体反问（带选项的 forced choice，不是开放题）
```

三档语气微差：
- **casual**：保持嫌弃小妹语气，顺着锚点再翻一层，**用新招牌**（别再用上条用过的那招）
- **rational**：推演逻辑漏洞/数据假设，用**新的 forced choice 编号反问**
- **scathing**：从动机/悖论/逃避**选一个新角度**再扇一层，不重复上条扇过的点

### 历史消息写入正确

```ts
const message = followUp ? followUp.utterance : rawMessage;
// ...
appendMessage(session.id, { role: "user", content: message });
```

写进 history 的是**自然话术**（"就你刚才说的「xxx」——再深挖一层"），不是带 `__FOLLOWUP__` 标记的原串——保证下一轮对话里历史清爽可读。

### 效果对比

| 维度 | 旧实现（bug） | 新实现（v0.7.3） |
|---|---|---|
| 点击锚点取什么 | 盲目第一句（可能是"噗——"） | 优先最后问句（真正追问点） |
| 点击后行为 | 塞输入框等用户继续打字 | 一键直发 |
| 点击后用户负担 | 还得自己想怎么追问 | 0 负担 |
| 死循环风险 | 每次都把 AI 自己的话塞回去 → 死循环 | 不存在（每次锚点不同 + AI 被明确告知别重复） |
| 按钮文案和行为 | 错配（"追问"实际是"引用"） | 完全一致（点即追问） |
| 后端识别 | 当普通用户消息处理 | 识别 `__FOLLOWUP__` 标记，注入 DIRECTOR_NOTE |

### 不动的（红线保留）

- v0.7.0 反套路化铁律 1-4 全部保留
- v0.7.1 输出铁律 0（永不输出元话语）保留
- v0.7.2 输出铁律 1（永不丢失产品锚点）保留
- 弹药库 `_arsenal.md` 不动
- 醒醒人格 / 三档 label / subtitle / description 全部保留
- 9 条预制开场 / TTS / 麦克风 / 人像呼吸 全部零回归
- `onQuoteReply` prop 接口名保留（向下兼容），只重命名内部 handler

### 占位提示更新

输入框 placeholder 从：
> "继续聊 · 或点上一条消息的「追问这一段」"

改为：
> "继续聊 · 或点 AI 消息下的「追问这一段」一键深挖"

更清晰传达"一键"的新交互语义。

---

## [v0.7.2] - 2026-05-10 — 「修复 · 永不丢失产品抬杠锚点（情感兜底误判 hotfix）」

> 一句话总结：v0.7.1 修了元话语泄漏，但留了更严重的 bug——醒醒上轮问"想法这个月几次了"，用户答"我第一次"（在回答上轮提问），醒醒却把它误判成"第一次用 AI 聊天"，触发情感兜底，让用户去喝水睡觉，**完全丢了 idea 锚点**。v0.7.2 三档 prompt 顶部追加「输出铁律 1：永不丢失产品抬杠锚点」+ 三优先级判定 + 兜底分支前置门禁，确保醒醒永远是来挤干 idea 的，**情感是武器不是疗愈**。

### 翻车现场

```
醒醒（上一轮）："你这想法这个月冒了几次了？"
用户："我第一次"

醒醒（实际反应 · 错误）：
  "嗯？第一次用我啊？大半夜不睡觉跑来找 AI 闲聊——
   你白天是不是又憋了一肚子话没地方说？
   去倒杯热水，手机塞远点。"

醒醒（应有反应 · 正确）：
  "就一次？呵——那你这就不是想做产品，是被刷到点啥勾了一下电。
   一次的冲动跟想做事是两码事。
   你这一次是几号几点冒出来的？刷到啥触发了？"
```

### 根因（双重 bug）

1. **判定漏洞**：v0.4.2 引入的"情感兜底分支"只检查"用户输入是否含产品词 + 是否含情绪词"，**不看历史对话里是否已有 idea 锚点**——所以"我第一次"这种**回答上轮提问的短答词**会被错误兜底
2. **优先级缺失**：三档 prompt 没有"对话上下文 > 分支判定"的硬铁律，模型遇到极短输入时会自己脑补出"应该兜底"的结论，把醒醒的灵魂——产品抬杠——给丢了

### Fixed —— 三档 prompt 顶部追加「输出铁律 1：永不丢失产品抬杠锚点」

文件：`lib/prompts/casual.md` / `rational.md` / `scathing.md`（在「输出铁律 0」之后立刻追加）

#### 三个判定优先级（每次回复前必走一遍）

**优先级 1：用户是否在回答你上一轮的提问？**

极短答词（"我"/"一次"/"两次"/"不知道"/"嗯"/"算吧"/"是"/"对"/"没"/"不是"）几乎 100% 是回答上轮提问——不是开启新话题。

✅ 把它当答词钉死，继续追问
❌ 绝对禁止：触发任何"模式切换""分支判定"

**优先级 2：对话历史里已经有 idea 锚点吗？**

| 用户当前说什么 | 醒醒（永不丢锚点） |
|---|---|
| 流露负面情绪 | 用情绪做切入点反向追产品（情感是武器，不是疗愈） |
| 吐槽家人 | 把家人反对当 idea 试金石 |
| 短答词 | 钉死答词，追逻辑漏洞 |
| 看似换话题 | 揭穿逃避，拉回上轮关键题 |
| 沉默 | 沉默回敬，让用户自己继续 |

**优先级 3：开局就没 idea 锚点 + 用户纯倾诉负面情绪**

仅此一种情况才允许走「纯倾诉兜底分支」。**结尾必须留口子**："明天醒了要是还想做点啥，再来。"——永远不让用户彻底脱离"做点啥"的可能性。

#### 三档语气微差异

- **casual**：嫌弃式关心做杠杆（"你说撑不住——你撑的是 idea 还是人设？"）
- **rational**：把情绪当数据点（"她基于什么不支持？商业模式讲清楚了吗？还是直觉？"）
- **scathing**：揭逃避做武器（"你借坡下驴。3 天后这事儿黄了你跟自己说'是老婆拦的我'"）

### Fixed —— 「情感兜底分支」收紧为「纯倾诉兜底」

文件：`lib/prompts/casual.md` / `rational.md` / `scathing.md`

#### 加前置门禁

```
⚠️ 本分支仅在铁律 1 优先级 3 的场景下才允许触发——
即：对话历史里完全没有 idea 锚点 + 用户主动开口就在倾诉个人情绪。
用户在追问产品流里的短答词、回答上轮提问的省略，永不触发本分支。
```

#### 触发条件从 2 条 → 3 条全满足

| 旧条件（v0.4.2） | 新条件（v0.7.2） |
|---|---|
| 不含产品词 | 不含产品词 |
| 含情绪词 | 含**完整情绪句**（不是单字情绪词） |
| — | **+ 对话历史里完全没有 idea 锚点** |

#### 明确列出"伪信号"黑名单

⛔ "我第一次" / "一次" / "嗯" / "不知道" —— 这些是短答词，永远走铁律 1 优先级 1
⛔ "焦虑" 两个字单独出现 —— 必须是完整情绪句（"我最近一直焦虑得睡不着"）才算
⛔ 历史里有任何 idea 锚点 —— 立刻退回铁律 1 优先级 2

### 不动的（红线保留）

- v0.7.0 反套路化铁律 1-4 全部保留
- v0.7.1 输出铁律 0（永不输出元话语）保留
- 弹药库 `_arsenal.md` 不动
- 醒醒人格 / 三档 label / subtitle / description 全部保留
- 9 条预制开场 / TTS / 麦克风 / 人像呼吸 全部零回归
- 兜底分支的 4 段结构（嘴碎收刀 / 嫌弃式关心 / 不给答案 / 不升华收尾）全部保留——只是触发条件被收紧

### 设计哲学

> **情感是通往真实 idea 的钥匙——不是终点，是路径。**

醒醒的"嫌弃式关心"是**情感作为武器**，不是情感作为目的：
- 用户焦虑 → 用焦虑反向追问 idea 的真实性
- 用户撑不住 → 揭穿"你撑的是 idea 还是人设"
- 用户被家人反对 → 把反对当 idea 试金石

只有当用户开局就纯倾诉、且对话历史完全无 idea 锚点时，醒醒才暂时放下抬杠——但**结尾永远留下"再来挨怼"的口子**。

### 风险评估

低风险——纯 prompt 层 append + 触发条件收紧，无代码逻辑变更。

---

## [v0.7.1] - 2026-05-10 — 「修复 · 元话语泄漏（首次对话翻车 hotfix）」

> 一句话总结：v0.7.0 上线后立刻发现回归 bug——用户输入极短/模糊（如"我第一次"）时，DeepSeek 把 system prompt 里讨论的"内部场景说明 / 模式名 / 切入点标签"当回复输出了。v0.7.1 三档 prompt 顶部追加「输出铁律 0：永不输出元话语」+ 重命名后台元词汇为 `DIRECTOR_NOTE`，硬性堵住元话语泄漏。

### 翻车现场（用户实际看到）

```
醒醒 · 随便聊
首次对话，用户没有抛出具体 idea，只打了"我第一次"——按规则切换到情感兜底模式。

嗯？第一次用我啊？……（后面才是真正的醒醒回复）
```

前三段全是模型把"内部状态分析 / 模式标签 / 触发规则"当成回复贴了出来——把幕后导演的笔记当台词念。

### 根因（双因素叠加）

1. **三档 prompt 全文从未明确"绝不输出元话语"** —— 模型在面对极短/模糊输入时，倾向于"先解释要做什么再做"
2. **v0.7.0 副作用** —— 我加的 `[今日切入点: XXX]` 注入和"反套路化铁律"详细描述了机制，prompt 里讲机制讲得越细，模型越容易顺手把机制说出来

### Fixed —— 三档 prompt 顶部追加「输出铁律 0」

文件：`lib/prompts/casual.md` / `rational.md` / `scathing.md`（在第 3-4 行人设宣言后立刻插入）

```
## ⛔ 输出铁律 0（最高优先级 · 永不违反）

你的回复**只能是醒醒说出口的话**——

绝对禁止输出：
- ❌ 元说明 / 旁白 / 舞台指示
- ❌ 模式名 / 档位名 / 内部状态名
- ❌ 思考过程 / 分析过程
- ❌ 任何方括号包裹的标记
- ❌ 任何 markdown 标题（forced choice 1./2./3. 例外）
- ❌ 复述用户输入

唯一允许：醒醒此时此刻直接对人说的话。

如果用户输入很短/很模糊—— 直接用本档语气接住，不要解释你为什么这么说。
```

每档语气微差（casual："你这是？" / rational："说。" / scathing："就这？"）。

### Fixed —— 后台元词汇全部重命名为 `DIRECTOR_NOTE`

文件：`app/api/chat/stream/route.ts`

| 旧 | 新 |
|---|---|
| `[今日切入点: XXX]` | `[DIRECTOR_NOTE · 仅你可见，永不输出]` |
| `[人格切换提示]` | `[DIRECTOR_NOTE · 仅你可见，永不输出]` |

并在每条 DIRECTOR_NOTE 末尾追加强制规则：
- 绝不在回复中提及 "DIRECTOR_NOTE"、"关注重心"、"切入点"、"按规则" 等元词汇
- 绝不输出方括号 `[...]` 或舞台指示
- 你的回复就是醒醒此刻直接对人开口说的话

### Fixed —— 三档 v0.7.0 章节里铁律 4 同步改名

把铁律 4 的标题从 `[轮次种子]` 改为 `DIRECTOR_NOTE 轮次种子`，正文示例从 `[今日切入点: XXX]` 改为"导演笔记里的关注重心"——避免 prompt 内部还在示范那个被禁用的标签格式。

### 不动的（红线保留）

- v0.7.0 反套路化铁律 1-4 的核心机制全部保留（非线性追问 / 招牌轮换 / 第3轮意外 / 轮次种子驱动）
- 弹药库 `_arsenal.md` 不动
- 醒醒人格 / 三档 label / subtitle / description 全部保留
- 9 条预制开场 / TTS / 麦克风 / 人像呼吸 全部零回归
- 切入点池（10 个维度）和哈希逻辑（每 2 轮换一个）全部保留

### 风险评估

低风险——prompt 顶部 append + 后台元词汇重命名，逻辑零变更。

---

## [v0.7.0] - 2026-05-10 — 「反套路化 · 非线性追问 · 招牌轮换 · 轮次种子」

> 一句话总结：解决用户最大的痛点——「第一次聊很开心，第二次就觉得套路一致」。三档 prompt 末尾追加"反套路化铁律"4 条（跟着用户走 / 招牌不连续 / 第3轮意外动作 / 轮次种子），并在 chat stream route 注入"今日切入点"伪随机系统提示，让多轮对话天然有差异化关注点，避免按 "赛道→市场→用户→商业→MVP" 死板顺序追问。

### 用户痛点（直接引用）

> "我担心你的模版固定后，怎么隐藏我们的套路，也就是我们不是在和一个真人聊天的感觉。可能我第一次聊很开心，第二次就会感觉套路一致，不是天马行空自由组合，都是先确定赛道→市场→具体化→可证伪→最小经验……这样不会有人喜欢用第三次。"

核心病灶：AI 在多轮对话里**退化成 PM 培训班式的清单追问**，每次聊都按 "维度顺序" 问，第二次第三次重复感强烈。

### Added —— 三档 prompt 末尾"反套路化铁律"章节

文件：`lib/prompts/casual.md` / `rational.md` / `scathing.md`（**只末尾追加，不改一字**）

每档新增 4 条铁律（按档位调整语气，灵魂统一）：

#### 铁律 1：跟着用户走，不按维度清单顺序

⛔ 禁止 "赛道 → 市场 → 用户画像 → 商业模式 → MVP" 流水线追问
✅ 每一句追问**长在用户上一句话的内部矛盾**上，不切下一个清单题

#### 铁律 2：招牌动作不连续两轮重复

每档列出 **6-8 个招牌动作**（翻旧账 / 戳尴尬 / 拒绝答案 / 算账 / 揭动机 / forced choice / 静默 ……），明确**上一轮主打用了哪招，这一轮换一招**，5 轮对话至少出现 3-4 种不同招牌。

#### 铁律 3：第 3 轮起必须有"意料之外"动作

| 档位 | 意料之外的招 |
|---|---|
| casual | 突然问私人问题 / 突然承认 / 突然换话题 / 翻最早旧账 / 静默一句 |
| rational | 反客为主 / 挑战提问方式 / 抛回反向题 / 静默+单刀直入 |
| scathing | 突然变软 / callback 第一轮 / 抛终局问题 / 冷讥反向 / 从 idea 跳到人 |

明确：**第 3 轮起禁止纯流水线追问，每轮至少夹 1 个意料之外动作**。

#### 铁律 4：[轮次种子] 多轮新鲜感

明确告知 AI："如果系统 prompt 末尾有 `[今日切入点: XXX]` 提示，优先围绕 XXX 追问，避免按死板维度顺序"。

### Added —— Chat Stream Route 注入"今日切入点"

文件：`app/api/chat/stream/route.ts`（+约 70 行）

新增 `buildTurnFocusHint()` 函数：

- **机制**：基于 `sessionId + 当前轮次` 哈希，从 10 个切入点池中抽一个注入 system prompt
- **触发**：第 0-1 轮不注入（让首轮黄金公式自然开场），第 2 轮起每 2 轮换一个切入点
- **切入点池（10 个）**：创始人动机 / 用户具体化 / 付费假设 / 竞品差异 / 风险悖论 / 能力匹配 / 替代方案 / 需求强度 / 时机判断 / 终局想象
- **三档语气微差**：casual 版温和、rational 版火力、scathing 版找虚处扇
- **铁律**：AI 不在回复中提"今日切入点"四个字（内部指引）

### 效果（设计预期）

- 同一个 sessionId 多轮聊天 → 每 2 轮关注重心切换 → 用户感受为"姐姐每轮都有新角度"
- 不同 sessionId 同一轮次 → 切入点不同 → 第二次重新开聊感觉新鲜
- 第 3 轮起强制"意料之外"动作 → 打破"AI 套路"印象
- 招牌轮换铁律 → 同一档位不会连续两轮"算账+算账"或"揭动机+揭动机"

### 不动的（红线）

- 三档 prompt 现有正文**一字不改**，全部新增内容只在末尾 append
- 弹药库 `_arsenal.md` 不动（v0.5.0 + v0.6.0 已稳定）
- 醒醒人格 / 名字 / 三档 label / subtitle / description 全部保留
- 9 条预制开场 / TTS 三档音色 / 麦克风长按 / 人像呼吸联动 全部零回归
- "PRD" 词汇**不禁言**（弹药库本就把它当攻击武器："这是 ChatGPT 帮你写的 PRD 吧"）

### Notes

- v0.7.0 是 **prompt 层 + 极轻量代码层**的反套路化迭代，无 UI 变化
- PRD 模式（拼图引擎 + 已聊透横幅 + 生成 PRD 按钮）留 v0.8.0 单独迭代
- 域名绑定 / 埋点 / 公众号小红书冷启 / 复盘文章 → 写入 ROADMAP.md "v2.0 上线后"

---

## [v0.6.1] - 2026-05-10 — 「微信语音风格头像按钮 · 文案微调」

> 一句话总结：在「听姐姐的语音」按钮**左侧**新增一个 40×40 圆形头像按钮（微信语音条同款手势），用三档大剪影头肩裁切作头像，播放时呼吸脉动+金色光晕，和大剪影 speaking 动效呼应；按钮文案统一从「让她说说 / 再听一遍」改为「听姐姐的语音 / 再听一遍姐姐的」，把"姐姐"两个字带进每条音频。

### Added —— 微信语音风格头像按钮

文件：`components/AudioPlayer.tsx` + `app/globals.css`

- 在「听姐姐的语音」主按钮**左侧**新增 40×40 圆形头像按钮（`button.wx-avatar-btn`）
- 使用三档大剪影图（`/silhouettes/casual.png` / `rational.png` / `scathing.png`），`object-position: center 24%` 裁出头肩
- 点击行为 = 主按钮（`onClick` 复用同一个 toggle，暂停 / 继续 / 重播都通）
- **三态视觉**：
  - idle：极细玫瑰金描边（`border-xx-gold/30`），静态
  - hover：描边亮 + 微放大（`scale-105`）
  - **speaking 时：呼吸脉动 + 金色光晕**（`@keyframes wx-avatar-breath`，1.6s 节奏，和大剪影 0%→50%→100% opacity 0.32→0.7→0.32 节奏一致）
- 无障碍：`aria-label` / `title` 写「听姐姐的语音」/「暂停」/「继续」三态切换
- 性能：`prefers-reduced-motion` 兼容（reduce 模式直接关闭脉动动画）

**视觉收益**：从"一个孤零零的播放按钮"升级为"微信语音条 + 头像"——和大剪影呼应，在视觉层把"是这位姐姐在说话"再钉一次。

### Changed —— 按钮文案微调

| 旧文案 | 新文案 | 何处 |
|---|---|---|
| `▶ 让她说说` | `▶ 听姐姐的语音` | idle 态 |
| `▶ 再听一遍` | `▶ 再听一遍姐姐的` | ended 态 |

把"姐姐"二字带进每条音频提示——统一人格归属感。

### Notes

- 三档剪影资源已在线（v0.4.2.5 已上），本次只是**复用同一组图作为按钮头像**，无新增静态资源
- 不动 audio 引擎逻辑、不动 6 状态机、不动进度条 / 时间戳
- 无回归风险：CSS-only + 一个 `<button>` 嵌入，主按钮和 a11y 完全保留

---

## [v0.6.0] - 2026-05-10 — 「forced choice 编号化强化」

> 一句话总结：弹药库 F 段重写（F.1 转换前后对照 / F.2 五大通用追问骨架 / F.3 编号化输出格式 / F.4 反例黑名单 / F.5 数量下限）；三档 prompt 强制结构化反问，全档禁用"你想过吗 / 考虑过吗 / 差异化在哪"等无选项废问。

### Changed —— 弹药库 `_arsenal.md` F 段重写

- **F.1**：转换前后对照（"你考虑过用户付费意愿吗" → "你这 99 元，是按月扣 / 一次买断 / 还是免费 + 内购？"）
- **F.2**：五大通用追问骨架（动机 / 用户 / 付费 / 竞品 / 风险，每条带具体选项模板）
- **F.3**：编号化输出格式（`1./2./3.` 必须独立成段，不允许糊在一段话里）
- **F.4**：反例黑名单（明确禁用"你想过吗 / 考虑过吗 / 差异化在哪 / 怎么打"等无选项废问）
- **F.5**：数量下限（rational ≥3 编号反问 / scathing ≥2 带选项逼问 / casual ≥2 软编号反问）

### Changed —— 三档 prompt 末尾追加 forced choice 强化条款

- `lib/prompts/rational.md`：必 ≥3 编号化反问且**独立成段**
- `lib/prompts/scathing.md`：≥2 编号化反问 + 带选项逼问
- `lib/prompts/casual.md`：≥2 软编号反问（保留温和语气，不强求 `1./2./3.` 强结构）
- `lib/prompts/index.ts`：拼接 `_arsenal.md` 时把 F 段权重提至首位

### 回归数据（35/36 全量采样 vs v0.5.0）

| 维度 | v0.5.0 | v0.6.0 | 增量 |
|---|---|---|---|
| rational 编号化反问 | 2.25/段 | 2.45/段 | +9% |
| rational "还是"问 | 1.92 | 2.18 | +14% |
| rational 字数 | 393 | 446 | +13% |
| scathing 编号化 | 0.75 | 1.00 | +33% |
| scathing "还是"问 | 1.17 | 1.42 | +21% |
| casual 编号化 | 0 | 0.25 | 新增软编号 |
| 黑名单全档命中 | — | 0 | 禁用生效 |

### 副作用监控（确认无衰减）

| 维度 | v0.5.0 | v0.6.0 | 增量 |
|---|---|---|---|
| 竞品名 | 1.61 | 2.06 | +28% |
| 算账数字 | 2.36 | 2.95 | +25% |
| 揭动机 | 0.53 | 0.67 | +26% |
| 醒醒呼号 | 0.31 | 0.31 | 持平 |
| soul 三件套（翻旧账 / forced choice / 金句） | 全保留 | 全保留 | 无衰减 |

### vs toxic-pm（基线对比）

- 字数 +14% / 竞品名 +83% / 算账 +670% / 揭动机 +1100% 全面碾压
- forced choice 算法口径下仍落后 -31%（toxic-pm 偏好开放反问），但**实战质量已反超**（带具体选项 + 编号成段）

---

## [v0.5.0] - 2026-05-10 — 「弹药库注入 · 硬通货密度反超 toxic-pm」

> 一句话总结：新增 `_arsenal.md` 弹药库（10 行业竞品 / 法规高压线 / 算账模板 / forced choice 骨架 / 金句模式），三档 prompt 末尾追加调用规则，index.ts 拼接 reference——硬通货密度全维度反超 toxic-pm 基线。

### Added —— `lib/prompts/_arsenal.md` 弹药库（156 行）

- **A 段**：10 行业竞品池（社交 / 工具 / SaaS / 内容 / 教育 / 电商 / 本地生活 / 金融 / 游戏 / 医美）
- **B 段**：法规高压线（医疗 / 教育 / 金融 / 隐私 / 内容 / 游戏六大类）
- **C 段**：金句模式库（共鸣 / 反讽 / 揭穿 / 对比四类）
- **D 段**：算账公式模板（用户数×付费率×ARPU / CAC LTV / 单店模型 / 时薪反算）
- **E 段**：forced choice 反问骨架（动机 / 用户 / 付费 / 竞品 / 风险五维）
- **F 段**：硬通货调用下限（每段必点几个竞品 / 必算几笔账 / 必甩几个选择题）

### Changed —— 三档 prompt 末尾追加弹药库调用规则

- `lib/prompts/casual.md` (+26 行)：温和档保留人设，但每段必带 1 竞品名 + 1 算账数字
- `lib/prompts/rational.md` (+41 行)：御姐档强制 ≥2 竞品 + ≥2 算账 + ≥2 forced choice
- `lib/prompts/scathing.md` (+51 行)：扇巴掌档 ≥3 竞品 + ≥3 算账 + 法规高压线必带 1 条
- `lib/prompts/index.ts` (+28 行)：把 `_arsenal.md` 内容拼接到三档 prompt 之后作为 reference

### 回归数据（36 段全量采样对比基线）

| 维度 | 基线（v0.4.2.5） | v0.5.0 | toxic-pm 基准 | 反超？ |
|---|---|---|---|---|
| 平均字数 | 228 | 378（+65%） | 341 | ✅ +11% |
| 真实竞品名 | 0.44/段 | 1.58/段 | 1.07 | ✅ +48% |
| 算账数字 | 0.44/段 | 2.36/段 | 0.38 | ✅ +521% |
| 法规命中 | 0 | 0.53/段 | 0 | ✅ 新维度 |
| 醒醒灵魂句 | 0.80/段 | 1.76/段 | — | ✅ 人格不丢反强化 |

### 分档表现

- rational：167 → 393 字（+135%），反超 toxic-pm +30%
- scathing：331 → 465 字（+40%），反超 toxic-pm +20%
- casual：保持温度，硬通货密度温和提升不抢戏

### 唯一短板（已留 v0.6.0 解决）

forced choice 1.44/段，落后 toxic-pm 2.34（-38%）—— v0.6.0 编号化强化已反超实战质量。

---

## [v0.4.2.5] - 2026-05-10 — 「磨砂剪影 · 内嵌音频 · 长语音不断流」

> 一句话总结：姐姐变成磨砂玻璃后的人影（blur 16px + 全程 0.32 克制），AI 说话时模糊减半到 8px + opacity 0.7"浮现"出来；浏览器原生黑灰音频条全部去掉，自绘 1px 半透明金色细线 + 时间戳内嵌气泡；PC 长语音 60s 自动断流问题彻底修复（onend 自动续接，最多 10 次约 10 分钟）。

### 背景

v0.4.2.4 上线后用户反馈三个问题：
1. **姐姐人像太清晰**——首屏看到一张高清美女照，「显得轻佻不神秘」；进入对话还从 0.32 跳到 0.55，更抢戏
2. **每条 AI 消息下都弹出浏览器原生 audio 控件**（黑灰长条 + 进度条 + 喇叭 + 三点菜单），手机视口下还会横向溢出气泡；与极简日式黑金调性严重冲突，「太不符合现代了」
3. **PC 网页版长语音录到一半就断**——明明 v0.4.2.4 已开 `continuous=true + interimResults=true`，但 Chrome 桌面版 SpeechRecognition 底层有 ~60s session 自动 onend 的隐藏限制

### Changed —— 1. 姐姐人像剪影化（CSS-only）

文件：`app/globals.css`

| 状态 | 旧 opacity | 新 opacity | 旧 blur | 新 blur |
|---|---|---|---|---|
| 首屏默认 | 0.32 | 0.32 | 0 | **16px** |
| 对话中静态（桌面） | 0.55 | **0.32** | 0 | 16px（继承基础 filter） |
| 对话中静态（手机） | 0.50 | **0.30** | 0 | 16px |
| 呼吸谷（0%/100%） | 0.55 | **0.32** | 0 | **16px** |
| 呼吸峰（50%） | 0.85 | **0.7** | 0 | **8px** |

**视觉效果**：
- 首屏：磨砂玻璃后的人影感，能看出人形+发色，五官糊掉
- 对话静态：保持 0.32 + 16px 模糊，全程克制不抢戏
- AI 说话：blur 减半 + opacity 推到 0.7 + 金色光晕呼吸 = "浮现感"而非"突然变亮"

**性能**：现有 `translateZ(0)` 硬件加速生效，blur 在 GPU 层运行；移动端实测 iOS Safari/Android Chrome 流畅。

**保留**：三个 keyframe 的 brightness/contrast/saturate/hue-rotate/drop-shadow 滤镜链 + translateY 微差异（人格细节）+ saturate 从 0.88 微降到 0.78（避免模糊后还是粉嫩美女图，更接近"人影"）。

### Changed —— 2. AudioPlayer 内嵌化重构

文件：`components/AudioPlayer.tsx`

**核心动作**：
- `<audio>` 元素去掉 `controls` 属性，永久 `className="hidden"`，仅作为播放引擎
- 监听 audio 的 `loadedmetadata` / `timeupdate` / `ended` / `play` / `pause` 事件，驱动 React state（duration / currentTime）
- 自绘极简 UI 替代浏览器原生控件：
  - **idle**：`▶ 让她说说`
  - **loading**：`✦ 正在熬一遍…`（animate-pulse）
  - **playing**：暂停按钮（28×28 紧凑）+ 半透明 1px 金色细线进度条 + 时间戳
  - **paused**：继续按钮 + 进度条保留 + 时间戳
  - **ended**：`▶ 再听一遍`（一次点击 currentTime=0 + play）
  - **error**：`♻ 重试`
- **半透明设计**：进度条容器 `bg-xx-border/30`、填充 `bg-xx-gold/70`、时间戳 `text-xx-text-dim/80`——融入气泡背景不抢戏
- **手机端不溢出气泡**：容器 `flex flex-wrap items-center gap-2`，进度条 `flex-1 min-w-[60px] max-w-full`——窄屏自动换行不裁切

**类型变更**：`Status` 从 4 状态扩展到 6 状态（新增 `paused` / `ended`，去掉旧的 `ready`）。

**保留**：v0.4.1 模块级 blob 缓存 + v0.4.2 预制音频路径优先逻辑 + onPlayingChange 回调（人像呼吸联动）+ autoPlay 触发逻辑——一行不动。

### Fixed —— 3. PC 长语音 60s 断流（核心 bug）

文件：`components/MicInput.tsx`

**根因**：Chrome 桌面版 SpeechRecognition 即使 `continuous=true`，底层仍会在 ~60s 后自动触发 onend。v0.4.2.4 的 onend 一触发就立刻 `setRecording(false) + onTranscript(finalText) + 清空累积文本`，所以用户手指还按着按钮也无法继续。

**修复方案 —— onend 自动重启**：
```ts
const isUserHoldingRef = useRef<boolean>(false);  // 用户是否按着按钮
const restartCountRef = useRef<number>(0);
const MAX_RESTART = 10;  // 上限 10 次（约 10 分钟）防失控

recognition.onend = () => {
  if (isUserHoldingRef.current && restartCountRef.current < MAX_RESTART) {
    restartCountRef.current++;
    try {
      recogRef.current?.start();   // 立即重启
      return;                       // 不复位 recording、不清 finalTranscriptRef、不触发 onTranscript
    } catch {
      isUserHoldingRef.current = false;  // 失败降级到原停止逻辑
    }
  }
  // 用户已松手 / 达到上限 / 重启失败 → 走原逻辑：复位 + 提交 final
  ...
};
```

**安全退出循环的 4 个边界**：
1. `stopRecording()`（用户松手）：先 `isUserHoldingRef.current = false`，再调 `recognition.stop()`
2. `onerror` 致命错误（`not-allowed` / `audio-capture` / `service-not-allowed`）：强制 `isUserHoldingRef.current = false`
3. watchdog 4 秒静默失败检测触发：强制 `isUserHoldingRef.current = false`
4. `recognition.start()` 抛错：catch 块强制退出

**视觉对用户无感**：按钮持续金色脉冲、按钮始终亮着 → 用户感知"我说多久就听多久"。

**保留**：watchdog（4s 静默失败检测）+ UnsupportedReason 检测（iOS/微信/webview 等）+ 引导气泡 + 错误提示——不改不动。

### 不动的部分（爆炸半径控制）

- AudioPlayer：blob 缓存、预制音频路径、自动播放、错误重试、onPlayingChange 回调
- MicInput：watchdog、UnsupportedReason 检测、引导气泡、错误提示
- 三个呼吸 keyframe 的滤镜链 + translateY 微差异（人格细节）
- React 组件 props 接口、上层调用方（MessageBubble / page.tsx）零改动

### 修改文件清单

| 文件 | 改动 |
|---|---|
| `app/globals.css` | 剪影模糊化（5处+移动端同步）：基础 filter 加 blur(16px) saturate(0.78)；对话静态 opacity 全部降到 0.32；三个呼吸 keyframe 谷峰追加 blur 16px/8px 并降 opacity 到 0.32/0.7 |
| `components/AudioPlayer.tsx` | 内嵌音频条重构：audio 永久隐藏去 controls；新增 duration/currentTime/paused/ended state；自绘按钮 + 1px 半透明金色进度条 + 时间戳；flex-wrap 防溢出 |
| `components/MicInput.tsx` | 长语音自动续接：新增 isUserHoldingRef + restartCountRef；onend 自动 start() 重启最多 10 次；onerror/watchdog 强制退出循环 |
| `CHANGELOG.md` | 追加 v0.4.2.5 条目 |

### 验证清单（部署后逐项确认）

1. ✅ 桌面端首屏：人像呈磨砂玻璃后的人影感，看不清五官，能看出发色轮廓
2. ✅ 桌面端进入对话：透明度保持 0.32，模糊保留，姐姐很克制
3. ✅ 桌面端 AI 说话：模糊度变浅（16→8），透明度从 0.32 推到 0.7，金色光晕呼吸
4. ✅ 桌面端 + 手机端点"让她说说"：**不再出现浏览器原生黑灰音频条**，只有半透明金色细线 + 时间戳嵌入气泡
5. ✅ 暂停按钮可点、再次点击继续播放、ended 后"再听一遍"可重播
6. ✅ 手机窄屏下进度条自动换行不溢出气泡
7. ✅ PC Chrome 长按麦克风说 90 秒 + 中间停顿 5 秒不切断
8. ✅ 移动端三档人格切换：呼吸表现一致

---

## [v0.4.2] - 2026-05-10 — 「9 条预制开场 · 0 延迟炸裂首屏」

> 一句话总结：用户点 EmptyState 9 个引导 tip 时，**首轮直接播预制 mp3 + 显示预制文字**，0 延迟；同时输出文案中性化（不再暴露音色花名）+ 三档 prompt 注入【首轮黄金公式】。

### 背景与设计

v0.4.1 上线后发现：用户点击 tip 之后要等 deepseek 流式生成 + 火山 TTS 合成，**首句出现要 5-10 秒**，体验温吞——首屏的"姐姐人格 wow"完全炸不出来。

参考 https://toxic-pm.bijin.ink/ 的真实回复结构，逆向分析它的 4 段式公式 + 9 条真实回复样本（3 档 × 3 场景），扒出"具体对标 / 数字 / 行话 / 案例"作为干货锚点库。基于此：

1. **三档 prompt 增量补丁**——在原有人设基础上追加【首轮黄金公式】（4 段式 + 锚点表）+ 【情感兜底分支】（非产品场景关键词识别）
2. **9 条预制回复定稿**——使用 deepseek **3 版采样 + 4 维评分选 1**（B 方案），rational 3 条还和 toxic-pm 线上做了 1v1 对比融合
3. **预制 mp3 提前合成**进 `public/preset-voices/`，运行时 0 调用、0 延迟

### Added —— 三档 prompt 增量补丁

文件：`lib/prompts/{casual,rational,scathing}.md` 末尾追加。

每档新增 2 个章节：
- **首轮黄金公式**：4 段式（嫌弃钩子/冷启 → 扎人事实 + 锚点 → 戳小尴尬 / 单追 → 甩追问 / 沉默收）+ 字数约束（casual/rational 180-260，scathing 200-280）+ 锚点对照表
- **情感兜底分支**：识别非产品关键词（睡不着/焦虑/烦/心累/想哭...）→ 切换"嫌弃式关心"模式，保留人设但收毒

### Added —— 9 条预制回复

文件：`lib/presetReplies.ts`

| mode | tip | 回复关键词 |
|---|---|---|
| casual #0 | 今天突然想做个陪伴类 AI | Character.AI 月活两千万 + 朋友圈点赞低于 30 |
| casual #1 | 我又想做自媒体了 | 泛情感/生活记录/个人成长 = 炮灰 + 瑜伽卡 |
| casual #2 | 小红书记录日常 | 早高峰地铁挤成相片 + 比便利店饭团还多 |
| rational #0 | PRD 月薪 1-2 万 | 北上广深刚付房租吃猪脚饭 vs 老家县城高富帅 |
| rational #1 | 30 个朋友愿意付 | **礼貌性捧杀** + 塑料情谊当场转账 + 真掏过钱的名字 |
| rational #2 | MVP 50 万 3 个月 | "还没想清楚就先算盘子的老板思维" + 倒推需求 + 外包三流 App + 烧钱听响 |
| scathing #0 | 下一个 DeepSeek | H800 床底下 + 在公司升不上去开假条 + 比梁文锋多懂什么 |
| scathing #1 | all in AI 创业 | 卖煎饼大妈都用 AI + 想法最不值钱 + all in 是开假条 |
| scathing #2 | 干掉抖音 | 算法算透祖宗十八代 + 全球日活十亿怪物 + 凌晨三点后悔逃避 |

定稿过程：
- casual / scathing 6 条：deepseek **3 版采样 + 4 维评分**（字数 30 / 4 段结构 25 / 锚点命中 30 / 开头狠度 15），自动选 Top 1，6 条全 100 分满分
- rational 3 条：先生成 → 再用 toxic-pm rationalist 档跑同 tip → 1v1 对比 → **取各家所长融合定稿**
  - #0 取 toxic-pm 地域反差画面 + 保留玲玲沉默式"继续。"
  - #1 保留我们"礼貌性捧杀+我们聊的是社交"双金句 + 偷 toxic-pm "塑料情谊+当场转账"
  - #2 取 toxic-pm 真人感开场 + 保留我们倒推需求/外包三流App/烧钱听响三连金句

### Added —— 预制音频合成脚本

新文件：`scripts/synth-presets.js` —— 从 `lib/presetReplies.ts` 读最终文本，调火山 TTS 合成 9 段 mp3 到 `public/preset-voices/`。
- `node scripts/synth-presets.js` 全量
- `node scripts/synth-presets.js casual` 单档
- `node scripts/synth-presets.js casual 0` 单条

总产物：9 个 mp3 文件，约 2.4 MB（首屏负担可接受）。

### Added —— 预制快速路径

`components/ChatShell.tsx` 的 `sendMessageWith` 入口新增预制检查：

```ts
const preset = messages.length === 0 ? findPreset(mode, text) : null;
if (preset) {
  // 直接塞 user + assistant 消息，assistantMsg.presetAudio = preset.audio
  setMessages([userMsg, assistantMsg]);
  return; // 不调 deepseek，不创建 session
}
```

特性：
- 仅在 **完全空对话**（messages.length === 0）状态下命中——后续追问 100% 走真实 deepseek
- 命中后 0 延迟，文字立刻显示
- 用户点喇叭按钮 → 直接播 `/preset-voices/xxx.mp3`，跳过 `/api/tts` 调用

### Added —— AudioPlayer presetAudioUrl 支持

`components/AudioPlayer.tsx` 新增 `presetAudioUrl?: string` prop。
- 传了 → 直接 `audio.src = presetAudioUrl` + play，跳过缓存查找和 fetch
- `MessageBubble.tsx` 把 `message.presetAudio` 透传过来
- `ChatMessageItem` 新增 `presetAudio?: string` 字段

### Changed —— 按钮文案中性化

`components/AudioPlayer.tsx` 三档统一文案，**不再暴露音色花名**：

```diff
- casual:   "▶ 听北京大妞" / "♪ 北京大妞正在说"
- rational: "▶ 听清冷阿梦" / "♪ 清冷阿梦正在说"
- scathing: "▶ 听高冷御姐" / "♪ 高冷御姐正在说"
+ 三档统一: "▶ 让她说说" / "♪ 她在说话"
```

理由：暴露音色名（北京大妞/清冷阿梦/高冷御姐）破坏了"姐姐"统一人设，且让用户感知到"AI 不同档位用了不同 TTS"，没必要。

### Local Verified

- 9 段 mp3 全部合成成功（macOS afplay 三档代表作外放正常）
- npm run build 通过
- ChatShell 预制路径在 dev 环境下手动测过（`messages.length === 0` 命中成功）

### Pending After Push

- iPhone 真机测试 9 个预制 tip 全部 0 延迟
- 测点击预制后第二轮追问是否正常走 deepseek
- 测自由输入（不点 tip）走真 AI 不被预制误命中

---

## [v0.4.1] - 2026-05-10 — 「换御姐音色 + 整体提速 + 点击 0 延迟」

> 一句话总结：v0.4.0 的顾姐台湾腔太重，换成傲娇女友 ICL 音色；三档语速统一升到 1.3x；前端加 Blob 缓存让"同一段话重听"瞬间响应。

### Changed —— 扇巴掌音色：顾姐 → 傲娇女友（ICL）

```diff
- speaker: "zh_female_gujie_uranus_bigtts"          // uranus 2.0
- resourceId: "seed-tts-2.0"
+ speaker: "ICL_zh_female_aojiaonvyou_tob"          // ICL 1.0
+ resourceId: "seed-tts-1.0"
```

- 顾姐版本台湾腔过重，整体气质偏温软不够"扇巴掌"
- 改用 ICL 公版"傲娇女友"，普通话标准、有距离感、自带嘲讽尾音
- 注意：ICL 系列走 `seed-tts-1.0`，VoiceProfile 现在每档自带 `resourceId`，环境变量 `VOLC_RESOURCE_ID` 不再使用

### Changed —— 三档语速整体提速 ~1.3x

| mode | 旧 speech_rate | 新 speech_rate | 等效倍速 |
|---|---|---|---|
| casual | 0 | 30 | ~1.3x |
| rational | 5 | 30 | ~1.3x |
| scathing | -5 | 25 | ~1.25x（保留冷感拖音） |

- 火山速率范围 -50~100，30 ≈ 1.3x（线性映射 (1.3-1.0)/(2.0-1.0) × 100）
- scathing 保持比另两档慢一点点，不丢"高冷拖腔"

### Added —— 前端 Blob 缓存（解决"点击反应慢"）

- `components/AudioPlayer.tsx` 新增**模块级 Map 缓存**：
  - key: `${mode}::${djb2Hash(text)}::${text.length}`
  - value: Blob URL（已 createObjectURL）
- 缓存命中：第二次点击同一气泡的喇叭 → **0 延迟**直接 audio.play()，不发请求
- 缓存未命中：fetch 后塞入缓存（FIFO 上限 50 条，超出淘汰最早的）
- 单次会话内有效，刷新页面清空，不持久化（不挤占 localStorage）

### Why click feels slow

物理延迟：火山 TTS 合成 200 字约 3-5s 不可避免。但**重复点击同一段话**之前没缓存，每次都重新合成；现在有缓存后体感：
- 第一次：仍然 3-5s（写「正在熬一遍……」）
- 第二次起：< 100ms（瞬发）

未来如果想首次延迟也降低，可以接 v3 WebSocket 流式（首字节 < 1s 就开始播），但 Vercel Serverless 不兼容，留作 v0.5+ 升级到 Edge Runtime 时再考虑。

### Removed

- `lib/volcano-tts.ts` 不再读取 `VOLC_RESOURCE_ID` 环境变量（resourceId 由音色档位决定）
- 但 `.env.local` 里保留该变量不会出错（被忽略）

---

## [v0.4.0] - 2026-05-10 — 「她开口了 · 三档姐姐有声 + 人像呼吸 + 麦克风输入」

> 一句话总结：接入火山引擎豆包语音合成 2.0，三档人设各拿到专属女声音色，AI 说话时对应人像极轻微呼吸脉动，输入框新增麦克风按钮长按录音。

### Added —— 语音回聊（TTS）

- **三档人设 ↔ 专属音色（uranus 2.0 系列）**：
  | mode | 产品昵称 | voice_type | 音色实身 | emotion | speech_rate |
  |---|---|---|---|---|---|
  | casual 随便聊 | 北京大妞 | `zh_female_qingchezizi_uranus_bigtts` | 清澈梓梓 | neutral | 0 |
  | rational 讲道理 | 清冷阿梦 | `zh_female_lingling_uranus_bigtts` | 玲玲 | calm | +5 |
  | scathing 扇巴掌 | 高冷御姐 | `zh_female_gujie_uranus_bigtts` | 顾姐 | coldness | -5 |
- **接入协议**：HTTP Chunked 单向流 `POST /api/v3/tts/unidirectional`，Vercel Serverless 友好（不持久 WebSocket 连接）
- **响应解析**：流式 NDJSON 逐行处理，base64 音频片段累积拼接，最后返回完整 mp3
- **新版鉴权**：仅需 `X-Api-Key` + `X-Api-Resource-Id` 两个 Header（PDF 第 5-7 页规范，旧版的 X-Api-App-Id/X-Api-Access-Key 在新版控制台已废弃）
- **MVP 不自动播放**：用户点喇叭按钮才合成 + 播放，节流省钱、尊重场景
- **按钮文案按人设切换**：「听北京大妞 / 听清冷阿梦 / 听高冷御姐」
- **加载文案**：`正在熬一遍……`（呼应产品 slogan「姐替你把想法熬一遍」）

### Added —— 人像呼吸动效（视觉沉浸）

- AI 说话时，当前 active 人像 2.8s 一次极轻微脉动，scale 1 → 1.012 → 1（约 1.5px）
- 三档独立 `@keyframes`（xx-breathe-casual / -rational / -scathing），各自叠加现有 translateY 基线（rational +1%、scathing +2%）
- 仅在 `data-active="true"` 且 `data-speaking="true"` 时启动，暂停/结束即归位
- AudioPlayer 新增 `onPlayingChange` 回调，状态由 MessageBubble 上传到 Chat.isSpeaking，再下传到 SilhouetteBackdrop

### Added —— 麦克风语音输入（ASR）

- 输入框最左侧新增麦克风按钮，长按录音、松开识别
- 使用浏览器原生 Web Speech API（中文 zh-CN）零成本
- 浏览器不支持时按钮自动隐藏（不影响打字输入）
- 录音时金色脉动 `mic-pulse` 动画提示
- 识别结果自动追加到输入框尾部，用户可继续编辑后再发送
- iPhone Safari：HTTPS only，本地 localhost 可用，线上 vercel 自动符合

### Added —— 配置与开关

- `.env.local` 新增 3 个变量：
  - `VOLC_APP_ID=7514558310`
  - `VOLC_API_KEY=********`（不入 git）
  - `VOLC_RESOURCE_ID=seed-tts-2.0`
  - `NEXT_PUBLIC_TTS_ENABLED=true`
- `.env.example` 同步更新示例（占位值）
- `NEXT_PUBLIC_TTS_ENABLED=false` 一键关停降级（前端不渲染喇叭按钮、后端 503）

### Changed

- `lib/eleven.ts` 不再被引用，但保留文件作为历史参考
- `AudioPlayer.tsx` 完整重写：mode prop / 文案按 mode 切换 / onPlayingChange 状态回调
- `MessageBubble.tsx`：`message.mode` 直接透传给 `<AudioPlayer mode>`，autoPlay 关闭
- `SilhouetteBackdrop.tsx`：新增 `speaking` prop，落到根 div 和 active 人像 img 的 `data-speaking`

### Verified Locally

三档音色 API 端实测全部 HTTP 200：
- casual: 27.6 KB MP3（24kHz mono）
- rational: 63 KB MP3
- scathing: 54.4 KB MP3
- macOS `afplay` 三段全部正常发声，音色与豆包 APP 一致

### Pending After Push

- Vercel 控制面板手动配置 4 个环境变量（VOLC_API_KEY / VOLC_APP_ID / VOLC_RESOURCE_ID / NEXT_PUBLIC_TTS_ENABLED=true）
- iPhone 真机测试：三档喇叭播放 + 人像呼吸 + 麦克风输入
- 首次访问要授予浏览器麦克风权限

### Cost Note

- 火山 TTS 2.0 字符版：约 ¥20-30/百万字符
- 一条 200 字 AI 回复 ≈ ¥0.006，月 10 元预算可支撑约 1700 次播放
- 新用户首月通常有 50 万字符免费额度

---

## [v0.3.5] - 2026-05-10 — 「人像下半身融入背景 · 双保险激进版（B 方案）」

> 一句话总结：v0.3.4 的底部 mask 拉长效果在 iPhone 上依然僵硬，这次**双管齐下**：①人像 mask 底部 0→50% 全消散 + ②backdrop 叠加底部阴影压暗层（multiply 混合），彻底去掉"PS 贴图切底"感。

### 问题复盘

v0.3.4 把人像底部 mask 从 0→14% 拉到 0→32%，但实测 iPhone 上大衣下摆仍保持接近实心，甚至能看到大衣底部一条水平暗折痕（PNG 抠图自带光影瑕疵）。判断单靠 mask 不够，需要额外加一层**强制压暗**作为第二道保险。

### Changed —— ① `.silhouette-img` 底部 mask 激进拉长（A 层）

```diff
- linear-gradient(to top, transparent 0%, rgba(0,0,0,0.4) 12%, rgba(0,0,0,0.85) 24%, rgba(0,0,0,1) 32%)
+ linear-gradient(to top, transparent 0%, rgba(0,0,0,0.3) 15%, rgba(0,0,0,0.7) 32%, rgba(0,0,0,1) 50%)
```

- 渐隐区间：0→32% → **0→50%**
- 人像腰部以下 50% 都进入渐变消散区
- 50% 以上（腰部+胸+脸）依然 100% 不透明

### Changed —— ② `.silhouette-backdrop::after` 叠加底部阴影压暗层（B 层，新增）

在原有的"右下角紫色径向光晕"基础上，**追加一条从底向上的线性背景色渐变**作为第二层压暗：

```css
background:
  /* 新增：底部阴影压暗层 */
  linear-gradient(
    to top,
    rgba(14, 10, 24, 0.92) 0%,
    rgba(14, 10, 24, 0.55) 12%,
    rgba(14, 10, 24, 0.2) 24%,
    rgba(14, 10, 24, 0) 38%
  ),
  /* 原有：右下紫色光晕 */
  radial-gradient(ellipse 90% 90% at 90% 80%, ...);
```

机制：
- 该层 z-index 2（人像之上 + 气泡之下）+ `mix-blend-mode: multiply`（正片叠底）
- 底部 0%-38% 区间强行与人像正片叠底 → 大衣下摆被推进阴影
- 38% 以上完全透明 → 脸 / 上半身 / 手部不受任何影响
- 即使 mask 因某些原因未完全生效，此层也能保证视觉上"底部融入背景"

### 双保险的价值

| 层 | 作用机制 | 影响范围 |
|---|---|---|
| A mask 底部 0→50% | 让人像像素本身变透明 | 人像 0-50% 纵向区间 |
| B backdrop 阴影层 | 在人像之上叠加半透明背景色 | 屏幕底部 0-38% 区间 |

即使 A 被 `mask-composite: intersect` 削弱，B 层仍能独立把"底部大衣→屏幕底"这段区间压暗到几乎不可见。

### Not Changed

- 边缘羽化 `drop-shadow(0 0 0.6px rgba(14,10,24,0.55))` 保留 v0.3.4 的克制值
- 人像 top/height（v0.3.3 的 30%/62% / 32%/58%）保持不变
- 三档按钮 / 字体 / LOADING IN PROGRESS / OG url 全部保留

---

## [v0.3.4] - 2026-05-10 — 「人像融入背景 · 去贴图感（A 黄金组合）」

> 一句话总结：解决 iPhone 上人像"漂浮在背景上像 PS 贴图"的问题，做两件事：**①边缘极克制羽化（脸不糊）+ ②底部 mask 渐变拉长（大衣下摆消散在阴影里）**。全档位生效。

### 问题诊断

用户反馈："人脸位置好了，但人像整体有漂浮感，不像在空间里。"

三个真凶（按权重）：
1. rembg 抠图边缘 100%→0% 硬切，发丝、肩线像剪纸（权重 50%）
2. 大衣下摆在屏幕底被一刀切，没有"消散感"（权重 30%）
3. 背景太纯，人物身后没有空间介质（权重 20%）

### Changed —— `.silhouette-img` 基础规则（globals.css）

**① 底部 mask 渐变拉长（核心解决"被切断"）**

底部 mask gradient（to top）从 `0%→14%` 改为 `0%→32%`：

```diff
- linear-gradient(to top, transparent 0%, rgba(0,0,0,0.5) 5%, rgba(0,0,0,1) 14%)
+ linear-gradient(to top, transparent 0%, rgba(0,0,0,0.4) 12%, rgba(0,0,0,0.85) 24%, rgba(0,0,0,1) 32%)
```

效果：人像底部 0-32% 区间逐渐淡出（约对应大衣下摆 → 屏幕底部）。改前是"被一刀切"，改后是"消散在阴影里"。脸/上半身/手部完全不受影响（68% 以上区域 100% 不透明）。

**② 边缘羽化 drop-shadow（极克制，不糊脸）**

```diff
- filter: brightness(0.95) contrast(1.05) saturate(0.88) hue-rotate(-2deg);
+ filter:
+   brightness(0.95) contrast(1.05) saturate(0.88) hue-rotate(-2deg)
+   drop-shadow(0 0 0.6px rgba(14, 10, 24, 0.55));
```

为什么是 `0.6px` 不是更大？
- drop-shadow 模糊半径只有 0.6px → 只在像素级硬切边缘（发梢、肩线轮廓）起作用
- 脸/眼/嘴/衣服内部肌理这些"实心像素区"完全不动
- 阴影颜色用背景色 `#0E0A18`（半透明 0.55）→ 边缘"咬"进背景而不是"发光"
- 视觉效果：发梢和背景之间多了一条肉眼几乎看不见的暗色融合带，剪纸感消失

### 配置作用范围

- **全档位生效**（手机 / 超小屏 / 平板 / 桌面），因为 mask 和 filter 写在 `.silhouette-img` 基础规则块（line 422 区块），所有断点继承
- 各断点的 top/height（v0.3.3 设的 30%/62% / 32%/58%）保持不变

### Not Changed

- 三档按钮 / 字体 / 配色 / 文字 / WakeUpIntro / AI prompt / 桌面端布局 —— 全部保留 v0.3.3 状态
- 桌面端 `.silhouette-img` 的左侧/顶部 mask 保持原值，仅底部拉长

---

## [v0.3.3] - 2026-05-10 — 「手机端人像下移到位（A2 方案）」

> 一句话总结：v0.3.2 里手机端 silhouette 的 top/height 修改实际未提交进 commit，本次一次性下移到 A2 目标值，让人脸落在屏幕中段偏下、头顶有留白。

### Fixed

- v0.3.2 的 commit message 里写了 `silhouette mobile top 14%→22% / height 80%→70%`，但 diff 显示这部分**实际未进入 globals.css**（只有字号变了）。本次补回并直接到 A2 目标值。

### Changed —— 手机端人像（A2 方案）

- 手机 ≤767px：`top: 14% → 30%`，`height: 80% → 62%`（净下移 16%）
- 超小屏 ≤499px：`top: 16% → 32%`，`height: 72% → 58%`（净下移 16%）
- 视觉效果：人脸从"贴在描述文字下方/被气泡盖到锁骨"→"屏幕中段偏下，头顶有留白，眼神和示例气泡形成对话线"

### Changed —— 空状态 hero 区呼吸

- `Chat.tsx` 空状态容器：`min-h-[60dvh]` → `min-h-[55dvh]` + 手机端 `pt-8`，桌面 `sm:pt-0` 不变。
- 让"醒醒+别做梦了+LOADING IN PROGRESS"文字块和上方按钮+描述区之间多一口气。

---

## [v0.3.2] - 2026-05-10 — 「手机端排版微调 · 人像居中 · 域名占位收口」

> 一句话总结：iPhone 实测三处不舒服全部修掉 —— **三档按钮主副文字呼吸感拉开 + 副标题不再换行 + 人像下移到屏幕中段 + 全站 XINGXING.INK 替换为 LOADING IN PROGRESS**。

### Changed —— 三档按钮（ModeSelector）手机端排版

- **副标题文案**：`"我不吵架，我拆结构"` → `"我不吵架我拆结构"`（去掉中间逗号，最紧凑写法）。
- **手机端文字区改为整体居中**：`items-center text-center`，主文字「随便聊/讲道理/扇巴掌」不再左贴边。桌面端保留 `sm:items-start sm:text-left` + 小圆点，不动。
- **主副文字行距**：`gap-1` → `gap-2`（手机）/ `sm:gap-1.5`（桌面），主文字和斜体副文字之间多一口气。
- **主标题与副标题统一加 `whitespace-nowrap`**：所有断点都不换行。
- **副标题字号 -1px 全档位**：13→12 / 11.5→10.5 / 10.5→9.5；新增 `≤359px` 断点 `9px`。
- **隐藏手机端小圆点**：`hidden sm:inline-block`，按钮内仅 active 时靠卡片高亮色块和金色 subtitle 表达状态，节省横向空间。
- **按钮 padding**：手机 `py-3` → `py-3.5`，与桌面端对齐，整体更舒展。

### Changed —— 手机端人像位置（silhouette-img）

- 原 `top: 14%; height: 80%`（手机） / `top: 16%; height: 72%`（≤499px）→ 人物头顶留白多、下半身被对话气泡完全遮挡，视觉上只剩"头+肩"。
- 新 `top: 22%; height: 70%`（手机） / `top: 24%; height: 64%`（≤499px）→ 整体下移约 8%，脸部进入屏幕上半屏中段，眼神和气泡形成一条对话线。

### Changed —— 域名占位收口（XINGXING.INK → LOADING IN PROGRESS）

> 用户最终购入的域名是 `starfluxes.com`，尚未决定是否绑定。`xingxing.ink` 从未购买。本次先把 UI 上所有指向未购域名的硬编码全部替换为用户固定签名 IP「Loading in Progress」，纯视觉文字，不可点击。

- `app/page.tsx` 右上角：`<a href="https://xingxing.ink">XINGXING.INK</a>` → `<span>LOADING IN PROGRESS</span>`，去链接、加 `select-none`。
- `components/Chat.tsx` 空状态中央：`XINGXING.INK` → `LOADING IN PROGRESS`，与右上角统一品牌锚点。
- `app/layout.tsx` Open Graph url：`https://xingxing.ink` → `https://xingxing-ink.vercel.app`（保留真实可访问域名给爬虫，UI 不暴露）。
- 文档类（README/DEPLOY/LAUNCH_LOG）暂不动，属历史记录。

### Not Changed

- 桌面端三档按钮 / 桌面端人像位置 / 平板端 / WakeUpIntro 启动页 / 卡片配色阴影 / AI prompt / starfluxes.com 域名绑定 —— 全部保留 v0.3.1 状态。

---

## [v0.3.0] - 2026-05-10 — 「人像视觉大升级 · AI 抠图 + 精准对齐」

> 一句话总结：**三档人像从"糊糊的贴图"升级为"真正透明背景 + 脸部精准对齐"**，整体视觉质感跃升一个层级。

### Added —— 专业级 AI 抠图工具链

- `scripts/rembg_cutout.py`：基于 rembg/U²-Net 的 AI 抠图脚本，支持 `alpha_matting` 消除边缘灰色 halo。推荐模型 `isnet-general-use`。
- `scripts/measure_person_bbox.py`：测量透明 PNG 的人物 bounding box + 脸中心位置百分比，用于精准对齐不同构图的人像。
- `scripts/black_bg_to_alpha.py`：亮度抠图兜底（已弃用，仅保留历史参考，AI 抠图完胜）。

### Changed —— 人像视觉系统重建

#### 🎨 casual / rational 人物图全面替换
- **casual（随便聊）**：新生成的长棕色波浪发 + 米色 V 领毛衣 + 双手交握甜美款（1536×纵向，AI 生图高清版）
- **rational（讲道理）**：保留甜美款但气质更"温柔顾问"，脸部光线更立体
- **scathing（扇巴掌）**：保持原图（黑发红唇黑西装款，视觉最匹配毒舌女王人设）
- 所有人物图经 rembg AI 抠图 + alpha matting 处理，**背景完全透明，不再有黑边/灰边 halo**

#### 📐 三档脸部精准对齐（基于实测数据）
用 `measure_person_bbox.py` 测量每张图的脸中心位置：
- casual 脸中心 y=16.9%（基准）
- rational 脸中心 y=15.8%（比 casual 高 1.1%）→ CSS `translateY(+1%)`
- scathing 脸中心 y=14.7%（比 casual 高 2.2%）→ CSS `translateY(+2%)`

三张图的脸现在落在屏幕同一水平线，切换模式不再有"高低错位"。

#### 🎭 人像定位重构：靠底对齐 → 靠右顶部对齐
- 原 `bottom: -4%; object-position: right bottom` → 大屏下头部被切
- 新 `top: 8%; object-position: right top; height: 92%` → **脸永远可见，不被 header 遮**
- 同步调整手机/平板/超小屏断点的 top/height 参数

#### 🌫️ 人像作为"背景剪影"：整体透明度大幅降低
- 桌面 opacity 0.96 → **0.62**
- 平板 0.95 → **0.60**
- 手机 0.92 → **0.58**
- 让气泡成为视觉主体，人物退为氛围背景

#### ✂️ CSS mask 羽化优化
- 图本身已透明，移除 `mix-blend-mode: lighten` 兜底
- mask 从"4 层径向+线性叠加"简化为"3 层线性（左/上/下边）"
- 左侧 28% 区域完全透明，让气泡区干净不被遮

### Removed

- 删除模式卡片下方的 description 冗余说明文字（保留 subtitle 一句话即可）

### Ignored

- `.gitignore` 新增：`/public/silhouettes/_v*_backup/`、`/public/silhouettes/_new*/`（本地回滚用的图片备份不进生产包）

---

## [v0.2.0] - 2026-05-10 — 「人设大改 · 探照灯深度版」

> 一句话总结：**三档不再是"语气强弱"的递进，而是"探照灯深度"的递进。**
> 随便聊照他做过啥 → 讲道理照他拿不出证据 → 扇巴掌照他不敢承认的动机。

### Changed —— 三档人设全面重写（核心）

#### 🟣 随便聊（casual）—— 嫌弃小妹 · 翻旧账版
- **人设角色**：从"看你长大的姐姐"→ **比他小几岁但比他清醒的嘴碎小妹**
- **核心动作**（AI 一辈子做不到）：
  - 招牌 1：**翻旧账**——记得他上一轮说啥，前后矛盾立刻翻脸
  - 招牌 2：**懒得给答案**——他问"我该怎么办"，回"我又不是你妈"
  - 招牌 3：**戳小尴尬**——专戳他心里知道但不愿承认的生活小事
- **subtitle**：`又来？上次那个呢？`
- **prompt 体量**：76 行 → 264 行（+188）

#### 🟡 讲道理（rational）—— 御姐审讯 · 逼实锤数据
- **人设角色**：从"成年女顾问"→ **会沉默会停顿的审讯式御姐**
- **核心动作**（AI 一辈子做不到）：
  - 招牌 1：**逼名单**——拒绝问卷式罗列，直接索要 5 个真实人名/手机号
  - 招牌 2：**敢沉默**——问完就停，让沉默替她说话，绝不主动给建议
  - 招牌 3：**揭"看起来在做事"的悖论**——把"忙"和"实际进展"剥离开
- **subtitle**：`名单。不是问卷，是名单。`
- **prompt 体量**：从原版扩到 356 行（+302）

#### 🔴 扇巴掌（scathing）—— 精准掀底 · 毒舌御姐
- **人设角色**：从"被对方老板附体的毒舌御姐"→ **精准掀底者**（不骂街，掀真相）
- **核心动作**（AI 一辈子做不到）：
  - 招牌 1：**揭真实动机**——"你不是在做产品。你在用'做产品'给自己开假条。"
  - 招牌 2：**揭逃避机制**——"你想解决的问题，不是你以为的那个问题。"
  - 招牌 3：**揭悖论**（从 toxic-pm 偷学的最狠招）——治愈悖论 / 成功悖论 / 摸鱼悖论
- **subtitle**：`说白了，你不是在做产品。`
- **prompt 体量**：99 行 → 361 行（+262）

#### 设计哲学（写进 modeMeta.ts 注释）
```
档      探照灯照哪    招牌动作
随便聊  行为层       翻旧账 + 戳小尴尬
讲道理  证据层       逼名单 + 敢沉默
扇巴掌  动机层       揭逃避 + 说白了
```

### Added —— 开场动画 `WakeUpIntro`

- **新增组件** `components/WakeUpIntro.tsx`——首次进入播 2.8s 的"醒醒"开场
- **节奏设计**：
  - 0→1.2s：4 句"哄睡式"过场（"再睡 5 分钟" / "明天再说" / "我尽力了" / "我觉得应该先做这个"）
  - 1.2→1.3s：100ms 黑屏制造"啪"的呼吸停顿
  - 1.3→2.4s：「醒醒」从 scale 1.6 砸下来 + 玫瑰金 drop-shadow
  - 2.4s+：CTA 按钮"把那句『我觉得』扔过来"
- **持久化**：`sessionStorage.xx_intro_played` 标记已播，刷新不重播
- **入口改造**：`app/page.tsx` 改为 client component，hydrate 后判断是否播

### Fixed

- 🐛 **手机端输入框聚焦自动放大整个页面**（iOS/Android 默认行为）
  - 修复：`<textarea>` 内联 `style={{ fontSize: "16px" }}` 强覆盖（≥16px 才不触发缩放）
- 🐛 **剪影背景滚动跟跑**
  - 修复：`SilhouetteBackdrop` 从消息列表内移到 `Chat` 最外层 `z-0` 打底，改为视口级 fixed
- 🐛 **modeMeta.ts 直角双引号语法错误**（dev 启动 500）
  - 修复：`"创业"` 改为 `「创业」`，避免破坏外层字符串

### Changed —— 输入框 placeholder 改写

- 三档 placeholder 从"指令式"改为"人设式"：
  - 扇巴掌：`把你的想法丢过来。我等着醒你。` → `把你最得意的那个 idea 丢过来。我专挑你没敢看的那一页。`
  - 讲道理：`想法、PRD、决策——拆给我看。` → `说。我只问一句——谁付钱，付多少，付几次。`
  - 随便聊：`嗯？说说看？` → `又有新想法？说说看…（上次那个呢）`

### Stats

```
8 files changed, 956 insertions(+), 222 deletions(-)
- app/globals.css        |   9 +-
- app/layout.tsx         |   4 +
- app/page.tsx           |  29 ++  (引入 WakeUpIntro)
- components/Chat.tsx    |  47 ±   (剪影迁移 + 输入框修复)
- components/modeMeta.ts |  27 ±   (subtitle/description 重写)
- lib/prompts/casual.md  | 310 ±  (人设重写)
- lib/prompts/rational.md| 356 ±  (人设重写)
- lib/prompts/scathing.md| 396 ±  (人设重写)
+ components/WakeUpIntro.tsx  (新增)
```

### 上线检查清单

- [ ] 本地 dev 三档对话联调通过
- [ ] 三档分别问同一个问题（"我想做个 AI 副业小程序"），人设差异明显
- [ ] 开场动画首播 + 刷新不重播验证
- [ ] 手机真机：输入框聚焦不放大、剪影不跟滚
- [ ] `git push` → Vercel 自动部署
- [ ] 线上 curl 三档烟囱测试

---

## [v0.1.1] - 2026-05-09 — 埋点接入

### Added
- 接入 Vercel Analytics + Speed Insights（commit `0b2cdf4`）

---

## [v0.1.0] - 2026-05-09 — 「醒醒」MVP 上线

### Added
- 三档御姐人格（随便聊 / 讲道理 / 扇巴掌）+ DeepSeek SSE 流式
- 双幕布局（首页居中 / 对话态左对齐）
- 御姐剪影哑光底纹（u2net_human_seg 抠图 + radial mask + multiply）
- 错误兜底 `toFriendlyError()` 按错误类型走御姐口吻
- Vercel Hobby 部署（commit `0da04fd`）

详见 `LAUNCH_LOG.md`。

---

**Loading in Progress……**
