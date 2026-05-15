# 醒醒 · 里程碑复盘档案

> 给未来的你看的"踩坑日记"。
>
> 每个里程碑版本（≥0.5h 工作量）都往这里加一段。
> 不写"今天做了什么"——CHANGELOG 已有。
> 只写"今天踩了哪些坑 / 哪些决策事后看是对的 / 哪些事后看是错的 / 给未来自己什么提醒"。
>
> 维护：mansonli001（Loading in Progress）

---

## v0.7.12.0 复盘 · 「Q 账本地基 + 外部评测吸收」

**版本号**：v0.7.12.0
**上线日期**：2026-05-15
**工作量**：约 7h（plan 预估 4.5h → 吸收外部评测意见后扩到 7h，实际接近 7h）
**commit 数**：5 个（4 个代码 commit + 1 个 docs commit · 主 repo） + 1 个 mind repo docs commit

---

### 一、本次想实现什么

用户原话：「我们最终交付物有了，也能输出提供了，接下来我们思考下为了这个目标怎么更好的优化3个姐姐的问问题……如果最终为了报告服务，那么我们如何优化姐姐的反问挤出我们用户回答的内容，报告完善，而且要不 落入套路，保持我们现有调性」

**翻译**：让醒醒每一刀都为最终诊断书服务，但不能变问卷。

**最终交付**：
- 🔴 3 个救命修复（qProgress 虚高 / BP 门槛太低 / emoji 漏修）
- 🟢 5 项地基（Q 账本类型 + 模块 + 判官 + 门槛 + 进度提示）
- 🟢 4 项用户感知（主页小行 / Chat toast / 诊断书 SVG / Toolbar SVG）
- 📋 3 项工程修缮（package.json / ROADMAP / README）

---

### 二、踩了哪些坑（按踩坑严重程度排序）

#### 🔴 坑 1：差点错过外部评测的 3 个救命洞察

**经过**：用户决策完前 3 个产品问题（账本 / 调性 / UI）后，我直接生成了 v0.7.12.0 plan，准备一包 4.5h 推。**就在这时用户贴来一份外部专家评测**。

**初始反应**：差点想走捷径"评测说得有道理但和我的 plan 冲突，我是不是不用全吸收"。

**真正的关键判断**：评测里有 3 个救命洞察我自己根本没看见——
- qProgress 虚高（看 assistant 关键词≠看 user 答了）
- BP 门槛 ≥2 轮太低（必产空洞 BP）
- 12-18 轮目标错了（应该是 6-10 轮挥到 2-3 刀）

**事后看**：如果当时盲推 4.5h 版本，会上线一个**自动数据虚高 + 必产空 BP 的劣化版**，反而比不做更糟。

**给未来的提醒**：
- ⚠️ **外部专家意见再多再杂也要逐条分类（直接吸收 / 转译吸收 / 暂缓 / 不吸收），不要怕分析麻烦**
- ⚠️ 22 条意见我用了两轮 ask_followup_question 才让用户拍板"一包推 7h"——这个 30 分钟的"分析+决策"投入回报巨大
- ⚠️ "AI 自己已有 plan + 外部专家有 plan" 这种冲突场景，**外部专家的优先级 ≥ AI 自己的 plan**

#### 🟡 坑 2：plan_create 工具返回截断了 todolist

**经过**：第一次 `plan_create` 返回时，todolist 数组在第三条的 `（` 处被截断，只生成了 3 条 pending todo（应该是 8 条）。

**修复**：直接读 `plan.json` 文件，用 `replace_in_file` 手工补齐。

**给未来的提醒**：
- ⚠️ `plan_create` 工具响应可能被截断（API 限流时尤其如此）
- ⚠️ 创建后**必须**读取 `plan.json` 验证 todolist 完整性
- ⚠️ 修复方法：直接 replace_in_file 改 plan.json，不要重跑 plan_create

#### 🟡 坑 3：todo_write 工具调用混入了 task 工具调用残片

**经过**：在 plan_update status="building" 之后，第一次 todo_write 我想"顺手并行派 code-explorer 子 agent"，结果工具调用格式坏了——todo_write 的 todos 字符串里被混入了 `</invoke><invoke name="task">` 等残片。

**修复**：撤回该次调用，单独发 todo_write，不并行派 task。

**给未来的提醒**：
- ⚠️ **不要在 todo_write 的 JSON 字符串里塞其他工具调用元素**——工具调用必须是独立的 invoke 块
- ⚠️ 想并行派 task agent，应该和 todo_write **作为两个独立 invoke** 在同一个 function_calls 块里发，不是嵌进 todo_write 字符串

#### 🟡 坑 4：API 限流（plan_create 时）

**经过**：第一次 plan_create 后立即第二次想跑 plan_create（觉得第一次截断了），命中 API 限流。

**修复**：sleep 30s 后重试。

**给未来的提醒**：
- ⚠️ plan_create / 大型 LLM 调用之间至少留 30s 间隔
- ⚠️ 高频改 plan.json 的话直接 replace_in_file，**不要**反复 plan_create

#### 🟢 坑 5：忘记了私藏 mind repo 的部署状态

**经过**：写 v0.7.12.0 plan 时记忆里还认为"mind repo 还没推 GitHub + 还没配 MIND_REPO_TOKEN"。直到最后核查文档一致性时才发现：mind repo 早就已经 push 了 + Vercel 也早配好 token 了，方法论矩阵生产环境完整生效。

**给未来的提醒**：
- ⚠️ **"我以为没做"的事情先 git log + curl 一下再说**
- ⚠️ 长记忆容易过期，每个里程碑版本结束**必须**更新一次记忆里的部署状态字段

---

### 三、哪些决策事后看是对的（值得复用）

#### ✅ 决策 1：4 commit 分步推送（不一次大 commit）

| commit | 层 | 行数 |
|---|---|---|
| `0783486` | 1/4 数据层（类型 + 4 模块） | +586 |
| `5b63f06` | 2/4 聊天层（fire-and-forget + 门槛 + 吃账本） | +192 |
| `b7d96ec` | 3/4 闭环层（summary API + 小行 + 提示 + OG cache） | +187 |
| `c840bf1` | 4/4 修缮层（emoji + 版本号 + ROADMAP/README） | +221 |

**为什么对**：
- 每个 commit 内部一致（同一层的事在一起）
- 任意一个 commit 出问题可独立 revert，不污染其他层
- 给未来 git bisect 留好锚点

**给未来的复用**：
- 任何 ≥4h 的 patch 都应该拆成 3-4 个 commit，每个 commit 可独立体检

#### ✅ 决策 2：fire-and-forget 判官，不阻塞主对话

**为什么对**：
- 主对话流式回复用户感知 0 影响（`done` 事件已发，判官在后台跑）
- 任何一步失败（judge LLM / KV / saveLedger）都静默吞，绝不抛回主链路
- 性能预算 ~300ms 用户完全感知不到

**给未来的复用**：
- 任何"为后续功能埋数据"的逻辑都应该走 fire-and-forget，绝不阻塞用户主路径

#### ✅ 决策 3：hasUserFact 双重兜底（规则 + LLM）

**做法**：
- 用户消息**不含 hasUserFact** 时直接跳过判官调用（防虚高 + 省钱兜底）
- 命中 hasUserFact 才调判官 → 减少 50%+ 不必要的 LLM 调用

**为什么对**：
- 一个简单规则函数（数字 / 大写词 / 长度 ≥30 / 具体动词）解决了 80% 的"是否值得调判官"问题
- 月成本预估从 ¥1.4 降到 ¥0.7

**给未来的复用**：
- 任何"调 LLM 判定"的场景都应该先想"有没有规则版能筛一遍"

#### ✅ 决策 4：BP 门槛 422 + 结构化 gate 字段

**做法**：不达标返 422 + `gate: { missingRounds, missingCoverage, currentTurns, currentCoverage }`

**为什么对**：
- 前端可直接展示"还差 X 轮 + Y 块"具体进度，不是模糊"再聊聊"
- 422 状态码标准化（与限流的 429 区分），方便监控告警

**给未来的复用**：
- 业务规则错误一律返 422 + 结构化字段，不要 400/500 + 文字 error

#### ✅ 决策 5：双 repo 文档同步策略

**做法**：
- 主 repo 改 README/ROADMAP/CHANGELOG/LAUNCH_LOG/DEPLOY 5 个文档
- mind repo 改 README/_methodology_history.md 2 个文档
- 都用同一个版本指针 v0.7.12.0，时间戳一致

**为什么对**：
- 未来任何时候打开任意一个文档都能找到"当前在哪个版本 + 上下文"
- mind repo 的 history 留下"主 repo v0.7.12.0 不动 mind repo 的原因"——下次类似场景不用重新思考

**给未来的复用**：
- 每个里程碑版本都必须做"双 repo 文档校对"作为最后一步

---

### 四、哪些决策事后看是 50/50（不确定对错）

#### 🟡 决策 1：一包推 7h 而不是拆两包

用户决策是 A（一包推），但当时也给了 B（拆两包紧急修复+地基）的选项。

**事后看**：
- ✅ 好处：4 commit 同时上线，外部评测意见 #1#2#3#10#11 一次性闭环
- ❌ 风险：如果中间某层有问题，回滚成本是整包
- 实际情况：没出问题，所以 A 选项胜出

**给未来的判断标准**：
- 7h 内能完成 + 4 commit 拆分 + 每层独立可回滚 → 一包推合理
- 单 commit 工作量超过 3h → 必须拆

#### 🟡 决策 2：暂缓"先跑 5 份 BP 测试"

外部专家意见 #1 强烈建议"先自己跑 5 份 BP 看质量再决定开发"。用户决策是 D（先推代码后测）。

**事后看**：
- ✅ 好处：工作流不被打断，一鼓作气推完
- ❌ 风险：BP 门槛升级 ≥6 轮 + 覆盖 ≥4 是不是太严？没真机验证就上线了
- 现状：线上 BP=0 还是 0，无法证实/证伪

**给未来的修正**：
- v0.7.13 第一件事**必须**真机跑 5 份 BP，验证门槛是否合适
- 如果 BP 门槛太严导致用户聊到 6 轮都过不了，要立即回调到 ≥5 轮

---

### 五、给未来的提醒（不要再踩同样的坑）

#### 5.1 工作流类

1. **外部专家意见 = 先分类再吸收**：22 条意见先做"直接吸收/转译吸收/暂缓/不吸收"四分类，再决定 plan
2. **AI 已有 plan + 外部专家有 plan 冲突时，外部优先级 ≥ AI**
3. **每次大 patch 必须拆 3-4 commit + 每层 tsc 体检**
4. **任何"我以为已做"的事先 git log + curl 验证**，不要靠记忆
5. **plan_create 创建后必须读 plan.json 验证 todolist 完整**

#### 5.2 工具调用类

6. **不要在 todo_write 字符串里嵌其他工具调用**
7. **plan_create 之间留 30s 防限流**
8. **修 plan.json 用 replace_in_file，不要反复 plan_create**

#### 5.3 文档同步类

9. **每个里程碑版本必须做"双 repo 文档校对"**：主 repo 5 文档 + mind repo 2 文档
10. **CHANGELOG 不允许跳版本号**——v0.7.12.0 之前漏了 v0.7.9.8/9/10/v0.7.11/.1/.2 共 6 版，本次回填后必须保持每版都补
11. **package.json version 跟 CHANGELOG 同步改**——本次发现 0.1.0 一直没改到 SemVer，丢人

#### 5.4 产品判断类

12. **"为最终目标服务"比"功能本身好不好"更重要**——本版核心是为诊断书服务，所以 BP 门槛升级是 P0
13. **数据虚高比无数据更糟**——qProgress 虚高 bug 险些上线
14. **空洞产物比无产物更伤口碑**——BP 门槛太低让用户晒不出去就是反向传播

---

### 六、四方一致性快照（v0.7.12.0 上线时刻）

> 这个快照证明"上线那一刻所有源都同步"，未来排查问题时可对照。

#### 6.1 Git 状态

| 仓库 | HEAD | 工作区 | 远程同步 |
|---|---|---|---|
| 主 repo `xingxing-ink` | `3a14908` | clean | ✅ origin/main = HEAD |
| 私藏 `xingxing-ink-mind` | `4c1fdb7` | clean | ✅ origin/main = HEAD |

#### 6.2 Vercel 线上验证

```
$ curl -s https://xingxing.starfluxes.com/api/stats/summary
{
  "totalVisitors": 29,
  "totalRounds": 95,
  "onlineNow": 0,
  "maxRounds": 12,
  "totalBpCount": 0,
  "totalQFullyCovered": 0,        ← v0.7.12.0 新字段已上线 ✅
  "modeDist": {
    "casual": 11,    "rational": 8,    "scathing": 22,
    "casualPct": 27, "rationalPct": 20, "scathingPct": 54
  },
  "generatedAt": 1778836527162
}

$ curl -sI https://xingxing.starfluxes.com/og?mode=scathing | grep cache
cache-control: public, immutable, ..., max-age=86400  ← v0.7.12.0 OG cache ✅

$ curl -so /dev/null -w "%{http_code}|%{time_total}s" https://xingxing.starfluxes.com/
200|1.09s
```

#### 6.3 文档版本指针

| 文档 | 版本指针 |
|---|---|
| `package.json` | `0.7.12.0` |
| `README.md` 顶部信息卡 | v0.7.12.0 |
| `ROADMAP.md` 当前线上版本 | v0.7.12.0 |
| `CHANGELOG.md` 最新条目 | v0.7.12.0 |
| `LAUNCH_LOG.md` 顶部当前版本 | v0.7.12.0 |
| `DEPLOY.md` 最近一次校对 | v0.7.12.0 |
| mind repo `README.md` 最近一次校对 | v0.7.12.0 |
| mind repo `_methodology_history.md` 最近一次校对 | v0.7.12.0 |

#### 6.4 数据基线（用作未来增长复盘对照）

- visitors=29 · rounds=95 · BP=0 · qFullyCovered=0
- modeDist：casual 27% / rational 20% / scathing 54%（怼人心智仍最强）
- 人均轮次=3.3（v0.7.12.0 BP 门槛 6 轮 = 当前 0% 用户达标 → 下次复盘看是否抬高到 50%+）

---

### 七、下一站（v0.7.13 ~ v0.7.15）

按近月 P0 三大重点：

1. **🔴 真机走 5 条黄金路径**（外部评测意见 #1 必须做）
   - 三档 × 满 4 轮 → BP → 长图 → 分享
   - 验证 BP 门槛 ≥6 轮 + 覆盖 ≥4 是否合适
   - 如果太严 → 回调；如果产 BP 但质量差 → 加严
2. **🟡 微信内置浏览器适配**（外部评测意见 #4 + 用户决策长期 P0）
3. **🟡 三档 picker 优先题差异化**（外部评测意见 #15 暂缓项 → 启动）

---

**Loading in Progress…… 今天到此为止，去休息。**
