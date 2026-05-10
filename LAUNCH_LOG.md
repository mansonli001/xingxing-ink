# 醒醒 MVP 上线日志

> 项目：xingxing-ink（"醒醒"——御姐风格 AI 对话产品）
> 上线日期：2026-05-09
> 作者：mansonli001（Loading in Progress / Cyber Loading）
> 线上：https://xingxing-ink.vercel.app/

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
