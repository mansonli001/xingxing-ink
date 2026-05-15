# 醒醒 MVP 上线日志

> 项目：xingxing-ink（"醒醒"——御姐风格 AI 对话产品）
> 上线日期：2026-05-09（v0.1 MVP 首版上线）
> 当前版本：v0.7.12.0（2026-05-15）
> 作者：mansonli001（Loading in Progress / Cyber Loading）
> 线上：https://xingxing.starfluxes.com/（v0.7.10 切自有子域）
> 历史 URL：https://xingxing-ink.vercel.app/（v0.7.10 之前）

> 本文档为 **MVP 首版上线档案**（5/9 当天写下的现场记录），保持原貌；
> 上线后的演进路线见末尾「上线后演进（v0.1 → v0.7.12.0）」+ `CHANGELOG.md` 完整变更记录。

---

## 一、产品定位

**一句话**：姐替你把想法熬一遍。

| 档位 | 人设 | 场景 |
|---|---|---|
| 随便聊 | 秀智风知性、温度感 | 想被理解、被陪伴 |
| 讲道理 | 短发灿笑、清醒利落 | 想被点醒、要建议 |
| 扇巴掌 | 红唇冷感、抱胸冷笑 | 想被骂醒、要狠话 |

**MVP 范围**：三档 prompt + DeepSeek SSE 流式 + 双幕布局（首页居中 / 对话态左对齐）。

---

## 二、技术栈

- Next.js 14 App Router + TypeScript
- Tailwind CSS + 原生 CSS（mask-image / mix-blend-mode）
- DeepSeek（SSE 流式）
- LXGW WenKai Screen（霞鹜文楷）
- rembg（u2net_human_seg 抠图）
- Vercel Hobby 部署

---

## 三、核心设计决策

1. **双幕布局**：`data-has-messages` 属性驱动首页/对话态切换
2. **字体改御姐亲笔信**：霞鹜文楷 + 米色家族三档字色（暖米/中米/冷米）
3. **人像哑光底纹化**：透明抠图 + radial mask + multiply 叠加
4. **Slogan 永远显示**：自定义 `.hero-slogan` 响应式缩字（不用 hidden 防小屏丢）
5. **错误兜底**：`toFriendlyError()` 按错误类型走御姐口吻

---

## 四、9 个关键坑

| # | 坑 | 修复 |
|---|---|---|
| 1 | 手机端 opacity 过低 | 全屏统一 0.95 |
| 2 | 小屏布局被 AI 改了 | 铁律：保布局只缩字体 |
| 3 | Slogan 小屏消失 | 自定义类 `.hero-slogan` |
| 4 | 生图太混血 | 换韩国三张参考脸 |
| 5 | API Key 暴露 | 换 Key + 吊销旧 Key |
| 6 | GitHub SSH 22 被封 | `~/.ssh/config` 走 443 |
| 7 | PNG 量化失败 | 回滚接受 6.7MB |
| 8 | multiply 压脸显脏 | 峰值 0.45 → 0.22 |
| 9 | 百分比遮罩窄窗糊脸 | 改 px 锁定 240/420 |

---

## 五、部署 SOP

### GitHub 推码（SSH 走 443）
```bash
cat >> ~/.ssh/config <<EOF
Host github.com
  Hostname ssh.github.com
  Port 443
  User git
EOF
git push -u origin main
```

### Vercel 环境变量（4 项）
| Key | Value |
|---|---|
| `DEEPSEEK_API_KEY` | sk-xxx |
| `DEEPSEEK_BASE_URL` | https://api.deepseek.com |
| `DEEPSEEK_MODEL` | deepseek-chat |
| `NEXT_PUBLIC_TTS_ENABLED` | false |

### 验证
```bash
curl -N https://xingxing-ink.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"mode":"casual","messages":[{"role":"user","content":"测试"}]}'
```
三档全通 ✅

---

## 六、下一步

### P0 本周
- [ ] 注册自有域名 `xingxing.ink`
- [ ] Vercel 绑定域名
- [ ] 接入埋点（PV / 三档点击率 / 平均对话轮次）

### P1 本月
- [ ] 三档数据观察 → 决定砍/补
- [ ] 公众号 + 小红书冷启
- [ ] 上线复盘文章

### P2 远期
- [ ] 语音（开关已预留）
- [ ] 历史对话本地缓存
- [ ] 付费档

---

## 七、个人收获

1. **Vibe Coding 不是不写代码，是不被代码卡住**——踩了 9 个坑还是上线了。
2. **AI 会过度发挥**——手机端布局它想"优化"我撤回了三次，铁律必须喊出来。
3. **抠图比 prompt 重要**——人物对了产品就有魂。
4. **上线只是起点**——留存还得看下一步动作。

---

**Loading in Progress……**

---

## 八、上线后演进（v0.1 → v0.7.12.0）· 2026-05-09 → 2026-05-15

> 这是上线**之后**补的，不是上线当天写的。本节为索引，详细变更见 `CHANGELOG.md` 与 `ROADMAP.md`。

### 8.1 域名升级（v0.7.10）

- 主域 `starfluxes.com` 在阿里云万网注册
- DNS NS 迁到 Cloudflare（橙云代理 · 解决国内 Vercel 不稳）
- 子域 `xingxing.starfluxes.com` 绑定本项目（v0.7.10 切换）
- 旧 vercel.app 域保留作 dev 兜底，不再对外推

### 8.2 私藏 mind repo 上线（v0.7.10）

- 主 repo 开源（`github.com/mansonli001/xingxing-ink`）
- 私藏 repo `xingxing-ink-mind`（醒醒方法论矩阵 v1.0 · 51% 内容）
- symlink + Vercel `MIND_REPO_TOKEN` 拉取，构建期注入
- 详见 README "私藏方法论 mind repo" 段

### 8.3 安全 P0 加固（v0.7.9.7.8）

- Chat Stream 双维度限流：IP 30/h + sessionId 200/d
- 全站基础安全响应头：CSP / HSTS / X-Frame-Options: DENY / X-Content-Type-Options
- 详见 `CHANGELOG.md` v0.7.9.7.8

### 8.4 诊断书全链路打通（v0.7.9.8 → v0.7.11.2）

- v0.7.9.8 骨架上线（暗夜玫瑰双主题三档差异化）
- v0.7.9.10 Header 重构 + 保存长图
- v0.7.11 LLM 真生成接通（DeepSeek + KV 持久化）
- v0.7.11.2 主页加「锤出 X 份 BP」+ 全面去 emoji 改 SVG

### 8.5 Q 账本地基（v0.7.12.0）

- 把醒醒"心里过"的 Q 进度升级为真账本（KV 90 天 TTL）
- fire-and-forget 判官 LLM 异步推断每轮挥刀增量
- BP 生成门槛 ≥2 轮 → ≥6 轮 + 有效覆盖 ≥4（防空洞 BP）
- 主页加「12 题里聊透 X 题」小行
- Chat 第 3/6/9 轮顶部进度提示
- 详见 `CHANGELOG.md` v0.7.12.0 完整条目

### 8.6 关于"第六节·下一步"的回顾

5/9 当时写的：

| 计划 | 状态 |
|---|---|
| P0 注册自有域名 | ✅ 完成（v0.7.10 starfluxes.com） |
| P0 Vercel 绑定域名 | ✅ 完成（v0.7.10） |
| P0 接入埋点 | ✅ 完成（v0.7.9.1 最小埋点 + v0.7.9.2 自建 KV 数据面板） |
| P1 三档数据观察 | 🟡 数据面板已建，等流量上来再砍/补 |
| P1 公众号 + 小红书冷启 | 🟡 公众号已写两篇 / 小红书要等换完域名后启动 |
| P1 上线复盘文章 | 🔴 推迟至少 1 个月（让产品先跑稳数据再写） |
| P2 语音 / 历史本地缓存 / 付费档 | 🔴 v0.8+ 才考虑 |

### 8.7 下一段路（v0.7.13 ~ v0.7.15）

按「近月 P0 三件事」推进，详见 `ROADMAP.md`：

1. **前端用户体验优化**（最高优先级）—— 真机走 5 条黄金路径 + 微信内置浏览器适配 + iOS Safari 防放大全覆盖
2. **扩展 PRD 等付费功能**（商业化探索，但 v0.8 才正式开）
3. **Debug**（用户反馈一个修一个，小步快跑）

---

**Loading in Progress…… still loading.**
