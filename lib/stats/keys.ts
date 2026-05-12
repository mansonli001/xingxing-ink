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

// ============================================================
// 实时在线（TTL 自动过期）
//   每 30s 前端 heartbeat 续约 120s TTL
//   主页查询时 KEYS online:sessions:* 计数
// ============================================================
export const K_ONLINE_SESSION = (sessionId: string) =>
  `online:sessions:${sessionId}`;
export const K_ONLINE_PATTERN = "online:sessions:*";

// ============================================================
// 后端配置常量
// ============================================================
export const ONLINE_TTL_SECONDS = 120; // 2 分钟无心跳视为下线
export const DAILY_KEY_TTL_SECONDS = 60 * 60 * 24 * 180; // 每日数据保留 180 天
export const VISITORS_SET_TTL_SECONDS = 60 * 60 * 24 * 400; // UV set 保留 ~1 年
