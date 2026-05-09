# 部署到 Vercel · 醒醒上线 SOP

> 给未来的自己（和任何想 fork 这个项目的人）看的部署备忘录。
>
> 目标：从零到 https://xingxing.ink 可访问，**45 分钟以内**。

---

## 第 0 步 · 上线前检查清单

- [ ] DeepSeek 控制台已生成可用 API Key（**生产用，不是开发用**）
- [ ] GitHub 账号已登录（mansonli001）
- [ ] Vercel 账号已登录（与 GitHub 同账号 mansonli001）
- [ ] 域名注册商账号（如果要绑定 xingxing.ink）

---

## 第 1 步 · 推送到 GitHub

### 1.1 GitHub 上建仓

打开 https://github.com/new
- **Repository name**: `xingxing-ink`
- **Description**: `醒醒——姐替你把想法熬一遍。御姐风格 AI 对话产品`
- **Public** 公开
- **不要勾** Add README / .gitignore / license（本地已有）

### 1.2 本地 git init + 推送

在项目根目录执行：

```bash
cd xingxing-ink

# 首次初始化
git init
git branch -M main

# 加远程
git remote add origin https://github.com/mansonli001/xingxing-ink.git

# 检查别上传敏感文件
git status
# 确认看不到 .env.local、_v1_backup 这些

# 第一次提交
git add .
git commit -m "init: 醒醒 MVP，三档人格 + 御姐人物 + 双幕布局"
git push -u origin main
```

### 1.3 验证

打开 https://github.com/mansonli001/xingxing-ink ，应该能看到所有代码、README 渲染正常、**没有 .env.local 文件**。

> ⚠️ 如果不小心把 .env.local 提交了——立刻 revoke 那把 API Key，重新生成。Git 历史里的密钥即使后来删了文件也还能被别人挖出来。

---

## 第 2 步 · Vercel 部署

### 2.1 New Project

打开 https://vercel.com/new ，选 `mansonli001/xingxing-ink` 仓库，点 **Import**。

### 2.2 项目配置

- **Framework Preset**: Next.js（自动识别）
- **Build Command**: `next build`（默认）
- **Output Directory**: `.next`（默认）
- **Install Command**: `npm install`（默认）
- **Root Directory**: `./`（默认）

### 2.3 ⭐ 配置环境变量（关键步骤）

展开 **Environment Variables**，添加：

| Key | Value | 说明 |
|---|---|---|
| `DEEPSEEK_API_KEY` | `sk-你的生产 Key` | DeepSeek 控制台生成的新 Key |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | 不用改 |
| `DEEPSEEK_MODEL` | `deepseek-chat` | 不用改 |
| `NEXT_PUBLIC_TTS_ENABLED` | `false` | TTS 暂不启用 |

每条 env 都勾选 **Production / Preview / Development**（三个环境都用）。

### 2.4 Deploy

点 **Deploy** 按钮，等 1-3 分钟。

部署成功会得到一个 `https://xingxing-ink-xxxxx.vercel.app` 的临时域名。点开测试三档人格能不能正常对话。

---

## 第 3 步 · 绑定 xingxing.ink 域名（可选，先用临时域名也能跑）

### 3.1 注册域名

如果还没注册，推荐：
- **Namecheap**：`.ink` 域名约 $10-15/年，操作简单
- **Cloudflare Registrar**：成本价（无加价），约 $9-13/年，但只能注册不能新购扩展，需要先到别处买再转入
- **阿里云万网**：国内方便，约 ¥80-200/年

### 3.2 在 Vercel 添加域名

1. 进入项目 → **Settings** → **Domains**
2. 输入 `xingxing.ink`，点 **Add**
3. Vercel 会显示需要在域名注册商配置的 DNS 记录

### 3.3 配置 DNS（在域名注册商处）

#### 方案 A：用 Vercel Nameservers（推荐，最省心）
把域名的 Nameservers 改成 Vercel 给的（通常是 `ns1.vercel-dns.com` 和 `ns2.vercel-dns.com`）。

#### 方案 B：保留原 Nameservers，只加 DNS 记录
- **A 记录**：`@` → `76.76.21.21`
- **CNAME 记录**：`www` → `cname.vercel-dns.com`

### 3.4 等待 DNS 生效

通常 5 分钟到 24 小时。可以在 https://dnschecker.org 检查全球生效情况。

Vercel 会自动签 Let's Encrypt SSL，HTTPS 自动启用。

---

## 第 4 步 · 上线后验证

### 4.1 功能验证

打开 https://xingxing.ink （或临时 `.vercel.app` 域名）：

- [ ] 首页加载正常（醒醒 / 别做梦了 / XINGXING.INK 三段式）
- [ ] 三张人物剪影在右下角显示，模式切换有交叉淡化
- [ ] 三档人格卡片左侧小头像显示
- [ ] 输入一条消息能正常流式返回
- [ ] 切换到另一档继续对话上下文连贯
- [ ] 移动端打开布局正常（开发者工具切到 iPhone 视图试）

### 4.2 性能验证

- 打开 https://pagespeed.web.dev ，输入域名
- LCP 目标 < 2.5s，CLS < 0.1
- 如果首屏太慢，检查人物 PNG 大小（每张应 < 200KB，超了用 pngquant 压）

### 4.3 错误监控

Vercel Dashboard → **Logs**：实时看 API 调用情况
- 大量 4xx → 检查 API Key 配置
- 大量 5xx → 检查 DeepSeek API 状态

---

## 第 5 步 · 后续迭代流程

### 日常代码更新

```bash
# 在 main 分支改完
git add .
git commit -m "feat: 调整 scathing 档语气阈值"
git push

# Vercel 检测到 push 自动部署，约 1-2 分钟生效
```

### 改 Prompt 不需要重新部署？

错——Prompt 在 `lib/prompts/*.md` 里，是构建期读取的（`fs.readFileSync`）。改完必须 push 触发重新部署。

### 改环境变量

Vercel Dashboard → **Settings** → **Environment Variables** → 改完点 **Redeploy** 让新值生效。

---

## 常见踩坑

### Q1：部署后报 `DEEPSEEK_API_KEY is not defined`
A：忘记在 Vercel 配环境变量了。补上后 Redeploy。

### Q2：部署后能打开但对话点送出没反应
A：打开浏览器 Network 面板看 `/api/chat/stream` 的状态：
- 401：Key 错了或过期
- 429：超出 DeepSeek 限速
- 500：看 Vercel Function Logs

### Q3：首屏字体几秒后才显示（FOUT）
A：霞鹜文楷从 jsDelivr 加载，首次访问慢是正常的。可以加 `font-display: swap`（已加）让字体加载完之前先用 fallback 字体显示。

### Q4：人物图加载慢
A：6 张 PNG 总 7MB，第一次访问偏大。优化方案：
- 装 pngquant 后 `pngquant --quality 65-85 --strip *.png` 能压到 30-40%
- 或用 Next.js 的 `<Image>` 组件自动转 WebP（需要重构 SilhouetteBackdrop）

---

## 紧急回滚

Vercel Dashboard → **Deployments** → 找到上一个稳定版本 → **⋯** → **Promote to Production**。

立刻回滚到那个版本，1 分钟生效。

---

最后提醒：**API Key 是钱**。不要在 Git、Slack、邮件里明文出现。永远走 Vercel/Cloudflare 的 Environment Variables。

Loading in Progress……
