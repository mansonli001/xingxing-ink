# 醒醒 · 更新日志

> 项目：xingxing-ink
> 线上：https://xingxing-ink.vercel.app/
> 维护：mansonli001（Loading in Progress）

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

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
