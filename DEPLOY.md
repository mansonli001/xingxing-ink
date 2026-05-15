# 部署到 Vercel · 醒醒上线 SOP

> 给未来的自己（和任何想 fork 这个项目的人）看的部署备忘录。
>
> 目标：从零到 https://xingxing.starfluxes.com 可访问，**45 分钟以内**。
>
> 本文最近一次校对：v0.7.12.0（2026-05-15）。
> 历史临时域名 `xingxing-ink.vercel.app` 仍可访问作 dev 兜底，但生产已切自有子域。

---

## 第 0 步 · 上线前检查清单

- [ ] DeepSeek 控制台已生成可用 API Key（**生产用，不是开发用**）
- [ ] Upstash 控制台已开 Redis 数据库（KV 自建数据面板用 · v0.7.9.2+ 必需）
- [ ] GitHub 账号已登录（mansonli001）
- [ ] Vercel 账号已登录（与 GitHub 同账号 mansonli001）
- [ ] 域名注册商账号（如绑定 starfluxes.com 子域）
- [ ] 私藏 mind repo `xingxing-ink-mind` 已建好（v0.7.10+ 必需 · 否则方法论矩阵走 fallback）

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

展开 **Environment Variables**，添加（v0.7.12.0 全量清单）：

#### 必填（生产功能依赖）

| Key | Value | 说明 |
|---|---|---|
| `DEEPSEEK_API_KEY` | `sk-你的生产 Key` | DeepSeek 控制台生成的新 Key |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | 不用改 |
| `DEEPSEEK_MODEL` | `deepseek-chat` | 不用改 |

#### KV 数据面板（v0.7.9.2+ 必填）

| Key | Value |
|---|---|
| `KV_REST_API_URL` | Upstash Redis REST URL |
| `KV_REST_API_TOKEN` | Upstash Redis REST Token |
| `KV_REST_API_READ_ONLY_TOKEN` | Upstash Redis 只读 Token（可选，给 admin 用） |

#### /admin 后台 4 层鉴权（v0.7.9.2+ 必填）

| Key | Value | 说明 |
|---|---|---|
| `ADMIN_PASSWORD` | 自定义强密码 | 后台访问密码（≥16 字符） |
| `ADMIN_IP_WHITELIST` | `逗号分隔 CIDR` | 例 `1.2.3.4/32,5.6.7.0/24`（可选） |

#### 私藏方法论 mind repo（v0.7.10+ 必填，否则走 fallback）

| Key | Value | 说明 |
|---|---|---|
| `MIND_REPO_TOKEN` | GitHub PAT（仅 `repo` scope） | 构建期 `scripts/fetch-mind-repo.sh` 拉私藏 repo 用 |

#### 可选 / 默认关

| Key | Value | 说明 |
|---|---|---|
| `NEXT_PUBLIC_TTS_ENABLED` | `false` | TTS 暂不启用 |

每条 env 都勾选 **Production / Preview / Development**（三个环境都用），除 `MIND_REPO_TOKEN` 可只勾 Production。

### 2.4 Deploy

点 **Deploy** 按钮，等 1-3 分钟。

部署成功会得到一个 `https://xingxing-ink-xxxxx.vercel.app` 的临时域名。点开测试三档人格能不能正常对话。

---

## 第 3 步 · 绑定 xingxing.starfluxes.com 子域（生产实际方案 · v0.7.10）

> 历史方案是 `xingxing.ink` 独立域，但因价格 + 个人品牌护城河考虑，
> 最终决策是用主域 `starfluxes.com` 留作个人主页，每个项目分配一个子域。
> 本项目子域：`xingxing.starfluxes.com`。

### 3.1 注册主域（一次性，未来所有项目共用）

阿里云万网注册 `starfluxes.com`（个人副业品牌主域 · ≈¥80/年）。

### 3.2 把 DNS 迁到 Cloudflare（一次性）

1. Cloudflare 添加站点 `starfluxes.com`（免费版）
2. 阿里云万网域名管理 → DNS 服务商 → 换 Cloudflare NS：
   `dora.ns.cloudflare.com` / `isaac.ns.cloudflare.com`
3. 等 DNS 全球生效（5 分钟 ~ 24 小时）

### 3.3 在 Vercel 添加子域

1. 项目 → **Settings** → **Domains**
2. 输入 `xingxing.starfluxes.com`，点 **Add**
3. 不勾选 redirect to www（子域不加 www）

### 3.4 在 Cloudflare 加 CNAME

`xingxing` → `cname.vercel-dns.com`（**橙云代理 ON** · 解决国内访问 Vercel 不稳）

### 3.5 等待生效 + SSL

- DNS 通常 5 分钟内生效
- Vercel 自动签 Let's Encrypt SSL
- HTTPS 自动启用
- Cloudflare 与 Vercel 双向 SSL 已验证兼容

### 3.6 铁律（同样适用于未来所有项目）

1. 永远不要把单一项目绑到主域 `starfluxes.com`（主域留作个人主页）
2. 子域不加 www（`xingxing.starfluxes.com` 不要 www）
3. 每个新项目用独立子域，方便未来项目独立或迁移
4. 推广分享一律用子域，不用 `vercel.app` 默认域名

---

## 第 4 步 · 上线后验证

### 4.1 功能验证

打开 https://xingxing.starfluxes.com （或临时 `.vercel.app` 域名）：

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

## 私藏 mind repo · 部署补充（v0.7.10+）

> 本项目核心方法论矩阵（醒醒方法论 v1.0）放在私藏 repo `xingxing-ink-mind`，
> 不开源，构建期通过 `MIND_REPO_TOKEN` 拉取并 symlink 到 `lib/prompts/_methodology`。
> 没配 `MIND_REPO_TOKEN` 时方法论层走 fallback（=v0.7.7 行为），不会构建失败。

### 完整启用步骤

1. **建私藏 repo**：GitHub 创建 `xingxing-ink-mind`，必须 **Private**
2. **推方法论本地 → GitHub**：
   ```bash
   cd ../xingxing-ink-mind
   git remote add origin git@github.com:mansonli001/xingxing-ink-mind.git
   git push -u origin main
   ```
3. **生成 GitHub PAT**：
   - GitHub Settings → Developer settings → Personal access tokens → Generate new token (classic)
   - 权限：仅勾选 `repo`（full control of private repositories）
   - **Token 只显示一次**，立即复制
4. **Vercel 加环境变量**：`MIND_REPO_TOKEN` = 上面的 PAT，仅 Production
5. **触发 redeploy**：main 推任意 commit 即可

### 验证

- Vercel build 日志应见 `[fetch-mind-repo] cloning...` 字样
- 不见则走 fallback（仍能跑，但方法论层降级）

### 健康检查脚本（本地）

```bash
node scripts/_v078_health.mjs
```

会检查 symlink、关键方法论文件存在性。

---

最后提醒：**API Key 和 PAT 都是钱**。不要在 Git、Slack、邮件里明文出现。永远走 Vercel/Cloudflare 的 Environment Variables。

Loading in Progress……
