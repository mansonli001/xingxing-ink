/**
 * POST /api/diagnosis/generate · v0.7.11
 *
 * 输入（JSON body）：
 *   - messages: ChatMessage[]   对话历史（前端传 ChatShell 当前 messages）
 *   - mode: ModeId              当前档位
 *   - sessionId: string         会话 ID（用于限流 + report.sessionId）
 *   - turnCount: number         已聊轮次（用于 report.generatedFromTurns）
 *   - qProgress?: number        12 问已命中数（可选 metadata）
 *
 * 输出（成功）：
 *   { ok: true, id: "d_xxx", url: "/diagnosis/d_xxx" }
 *
 * 输出（失败）：
 *   { ok: false, error: "...", retryable: boolean }
 *
 * 处理流程：
 *   1. 入参校验（messages.length >= 4 才放行 = 至少 2 轮对话）
 *   2. 限流校验（IP+sid 双维度）
 *   3. 生成 reportId
 *   4. 调 generator.ts 生成 DiagnosisReport
 *   5. 写入 KV（key=diagnosis:{id} · TTL=90 天）
 *   6. 返回跳转 URL
 *
 * 超时：30 秒（Vercel Pro 默认上限是 300s，免费版 60s）
 */

import { NextRequest, NextResponse } from "next/server";
import {
  generateDiagnosisReport,
  generateReportId,
} from "@/lib/diagnosis/generator";
import type { ModeId } from "@/lib/prompts";
import { checkDiagnosisRateLimit } from "@/lib/security/diagnosis-rate-limit";
import { getClient as getKvClient } from "@/lib/stats/kv";
import {
  K_TOTAL_BP_COUNT,
  K_DAILY_BP_COUNT,
  DAILY_KEY_TTL_SECONDS,
} from "@/lib/stats/keys";
import { loadLedger } from "@/lib/diagnosis/q-ledger";
import { checkBPEligibility } from "@/lib/diagnosis/bp-gate";

export const runtime = "nodejs"; // node 运行时（@upstash/redis + fetch 都兼容）
export const maxDuration = 30; // Vercel 函数超时

// =========================================================================
// 入参类型
// =========================================================================

interface GenerateRequestBody {
  messages?: Array<{ role?: string; content?: string }>;
  mode?: string;
  sessionId?: string;
  turnCount?: number;
  qProgress?: number;
  /** v0.7.12.1：用户被 gate 拦下后选择"强行出 BP"时为 true */
  force?: boolean;
}

const VALID_MODES: ModeId[] = ["casual", "rational", "scathing"];

// =========================================================================
// 主入口
// =========================================================================

export async function POST(req: NextRequest) {
  // ---- 1. 入参解析 ----
  let body: GenerateRequestBody;
  try {
    body = (await req.json()) as GenerateRequestBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "请求体不是合法 JSON", retryable: false },
      { status: 400 }
    );
  }

  // ---- 2. 入参校验 ----
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const mode = body.mode as ModeId | undefined;
  const sessionId =
    typeof body.sessionId === "string" && body.sessionId.length > 0
      ? body.sessionId
      : undefined;
  const turnCount =
    typeof body.turnCount === "number" && body.turnCount > 0
      ? body.turnCount
      : Math.floor(messages.length / 2);

  if (messages.length < 4) {
    return NextResponse.json(
      {
        ok: false,
        error: "对话还不够长，至少聊 2 轮再来出诊断书",
        retryable: false,
      },
      { status: 400 }
    );
  }
  if (!mode || !VALID_MODES.includes(mode)) {
    return NextResponse.json(
      { ok: false, error: "档位参数错误", retryable: false },
      { status: 400 }
    );
  }

  // 过滤+校验 messages 形状
  const validMessages = messages
    .map((m) => ({
      role: (m.role === "user" || m.role === "assistant") ? m.role : null,
      content: typeof m.content === "string" ? m.content : null,
    }))
    .filter(
      (m): m is { role: "user" | "assistant"; content: string } =>
        m.role !== null && m.content !== null && m.content.trim().length > 0
    );

  if (validMessages.length < 4) {
    return NextResponse.json(
      {
        ok: false,
        error: "有效消息不足 4 条",
        retryable: false,
      },
      { status: 400 }
    );
  }

  // ---- 3. 限流校验 ----
  const rl = checkDiagnosisRateLimit(req, sessionId);
  if (!rl.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: rl.message,
        retryable: false,
        retryAfterSeconds: rl.retryAfterSeconds,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSeconds) },
      }
    );
  }

  // ---- 3.5 BP 生成门槛检查（v0.7.12.0 · 防止空洞 BP 伤害口碑） ----
  // 读账本（不存在则用 null 走最严判定）
  const ledgerForGate = sessionId
    ? await loadLedger(sessionId).catch(() => null)
    : null;
  const eligibility = checkBPEligibility(turnCount, ledgerForGate);
  const force = body.force === true;

  if (!eligibility.eligible && !force) {
    // v0.7.12.1：返回更详细的 missingQuestions，让前端弹气泡 + bridge API 用
    return NextResponse.json(
      {
        ok: false,
        error: eligibility.message,
        retryable: false,
        // 给前端展示进度用
        gate: {
          missingRounds: eligibility.missingRounds,
          missingCoverage: eligibility.missingCoverage,
          currentTurns: eligibility.currentTurns,
          currentCoverage: eligibility.currentCoverage,
        },
        // v0.7.12.1：最缺的 1-2 题（前端弹气泡 + 调 bridge API 用）
        missingQuestions: eligibility.missingQuestions,
      },
      { status: 422 }
    );
  }

  // v0.7.12.1：force=true 时即使不达标也继续，但 report 标记 forced=true
  const isForcedGeneration = !eligibility.eligible && force;

  // ---- 4. 生成诊断书（30s 超时由 maxDuration 控制） ----
  const reportId = generateReportId();
  let report;
  try {
    report = await generateDiagnosisReport({
      messages: validMessages,
      mode,
      sessionId: sessionId || `anon_${reportId}`,
      turnCount,
      qProgress: body.qProgress,
      reportId,
      // v0.7.12.0：把账本作为"参考事实"传给 generator（已在 gate 阶段读过）
      prefilledLedger: ledgerForGate ?? undefined,
    });
    // v0.7.12.1：强行出 BP 时打 forced 标记，前端卡片会显示水印
    if (isForcedGeneration) {
      report = { ...report, forced: true };
    }
  } catch (err) {
    const msg = (err as Error).message || "生成失败";
    console.error("[/api/diagnosis/generate] 生成失败：", msg);
    // 区分：JSON 解析错误 = 可重试；API 错误 = 也可重试；余额不足才不可重试
    const retryable = !/insufficient|余额|quota|payment/i.test(msg);
    return NextResponse.json(
      {
        ok: false,
        error: retryable
          ? "醒醒喝口水，等几秒再点一下"
          : "醒醒今天累了，明天再来",
        retryable,
      },
      { status: 502 }
    );
  }

  // ---- 5. 写入 KV（90 天 TTL）----
  try {
    const kv = await getKvClient();
    await kv.set(`diagnosis:${reportId}`, JSON.stringify(report), {
      ex: 90 * 24 * 60 * 60, // 90 天
    });

    // 5.1 BP 计数埋点（v0.7.11.2 新增）—— 累计 + 当日，失败静默吞掉不阻塞主流程
    try {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      await Promise.all([
        kv.incr(K_TOTAL_BP_COUNT),
        kv.incr(K_DAILY_BP_COUNT(today)),
      ]);
      // 给当日 key 续 TTL（incr 不会自动设 TTL，这里 EXPIRE 覆盖式续期）
      await kv
        .expire(K_DAILY_BP_COUNT(today), DAILY_KEY_TTL_SECONDS)
        .catch(() => {});
    } catch (bpErr) {
      console.warn("[/api/diagnosis/generate] BP 计数埋点失败（已忽略）：", bpErr);
    }
  } catch (err) {
    // KV 写入失败不阻塞——降级直接报错让用户重试
    console.error("[/api/diagnosis/generate] KV 写入失败：", err);
    return NextResponse.json(
      {
        ok: false,
        error: "保存失败，再试一次",
        retryable: true,
      },
      { status: 500 }
    );
  }

  // ---- 6. 返回 ----
  return NextResponse.json(
    {
      ok: true,
      id: reportId,
      url: `/diagnosis/${reportId}`,
    },
    { status: 200 }
  );
}

// 不允许 GET，避免被爬虫/预取意外触发
export async function GET() {
  return NextResponse.json(
    { ok: false, error: "Method not allowed" },
    { status: 405 }
  );
}
