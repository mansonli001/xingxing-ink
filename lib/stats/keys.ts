/**
 * 醒醒 · 统计键名收口
 * 所有 KV key 都在这里生成，避免散落硬编码
 *
 * 命名约定：stats: 前缀 · 冒号分隔 · 全小写
 */

// ============================================================
// 累计计数器（终生累加）
// ============================================================
export const K_TOTAL_SESSIONS = "stats:total:sessions"; // 累计"开聊"次数
export const K_TOTAL_ROUNDS = "stats:total:rounds"; // 累计轮数（message_sent）
export const K_TOTAL_PRESETS = "stats:total:presets"; // 累计命中预制
export const K_TOTAL_FOLLOWUPS = "stats:total:followups"; // 累计点"追问这一段"
export const K_TOTAL_ERRORS = "stats:total:errors"; // 累计错误
export const K_TOTAL_INTRO_PLAYED = "stats:total:intro_played";
export const K_TOTAL_INTRO_SKIPPED = "stats:total:intro_skipped";
export const K_TOTAL_CLEARED = "stats:total:cleared"; // 累计清空重开
export const K_TOTAL_BP_COUNT = "stats:total:bp_count"; // 累计锤出诊断书份数（v0.7.11.2 新增）
export const K_TOTAL_Q_FULLY_COVERED = "stats:total:q_fully_covered"; // 累计聊透 Q 题数（v0.7.12.0 新增 · 全站汇总）

/** 独立访客 set —— 用 SADD 去重后 SCARD 得到 UV */
export const K_VISITORS_SET = "stats:visitors:set";

// ============================================================
// 三档分布（累计）
// ============================================================
export const K_MODE_CASUAL = "stats:mode:casual";
export const K_MODE_RATIONAL = "stats:mode:rational";
export const K_MODE_SCATHING = "stats:mode:scathing";

// ============================================================
// 极值
// ============================================================
export const K_MAX_ROUNDS = "stats:max:rounds_per_session"; // 最长一次对话轮数

// ============================================================
// 错误类型细分
// ============================================================
export const K_ERROR_BY = (type: string) => `stats:errors:by_type:${type}`;

// ============================================================
// 轮数分布（用于漏斗：第 N 轮有多少 session 达到）
// ============================================================
export const K_TURN_REACHED = (n: number) => `stats:turn:reached:${n}`;

// ============================================================
// 文本长度分布
// ============================================================
export const K_LEN_BUCKET = (b: string) => `stats:len:${b}`;

// ============================================================
// 当日统计（按日分桶，每日快照）
// ============================================================
export const K_DAILY_VISITORS_SET = (d: string) => `stats:daily:${d}:visitors`;
export const K_DAILY_SESSIONS = (d: string) => `stats:daily:${d}:sessions`;
export const K_DAILY_ROUNDS = (d: string) => `stats:daily:${d}:rounds`;
export const K_DAILY_ERRORS = (d: string) => `stats:daily:${d}:errors`;
export const K_DAILY_FOLLOWUPS = (d: string) => `stats:daily:${d}:followups`;
export const K_DAILY_MODE = (d: string, mode: string) =>
  `stats:daily:${d}:mode:${mode}`;
export const K_DAILY_BP_COUNT = (d: string) => `stats:daily:${d}:bp_count`;
export const K_DAILY_Q_FULLY_COVERED = (d: string) =>
  `stats:daily:${d}:q_fully_covered`; // 当日新晋聊透 Q 题数（v0.7.12.0 新增）

// ============================================================
// 实时在线（TTL 自动过期）
//   每 30s 前端 heartbeat 续约 120s TTL
//   主页查询时 KEYS online:sessions:* 计数
// ============================================================
export const K_ONLINE_SESSION = (sessionId: string) =>
  `online:sessions:${sessionId}`;
export const K_ONLINE_PATTERN = "online:sessions:*";

// ============================================================
// 会话级 Q 账本（v0.7.12.0 新增 · TTL 90 天 · session 维度）
//   存 12 题 × 0-3 刀 × userQuote 片段
//   每轮主对话流式回复完成后由判官 LLM 异步推断更新
// ============================================================
export const K_SESSION_LEDGER = (sessionId: string) =>
  `session:${sessionId}:ledger`;
export const SESSION_LEDGER_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 天

// ============================================================
// 后端配置常量
// ============================================================
export const ONLINE_TTL_SECONDS = 120; // 2 分钟无心跳视为下线
export const DAILY_KEY_TTL_SECONDS = 60 * 60 * 24 * 180; // 每日数据保留 180 天
export const VISITORS_SET_TTL_SECONDS = 60 * 60 * 24 * 400; // UV set 保留 ~1 年
