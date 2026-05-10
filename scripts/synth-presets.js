#!/usr/bin/env node
/**
 * ============================================================
 * 预制音频合成脚本（v0.4.2）
 * ============================================================
 *
 * 从 lib/presetReplies.ts 读取已定稿的 9 条 reply 文本，
 * 调火山 TTS 合成 9 段 mp3 到 public/preset-voices/。
 *
 * 与 generate-presets.js 的区别：
 *   - generate-presets.js  = 文本生成（调 deepseek，B 方案 3 选 1）
 *   - synth-presets.js     = 音频合成（仅调火山 TTS，文本已定稿）
 *
 * 用法：
 *   node scripts/synth-presets.js              # 合成全部 9 段
 *   node scripts/synth-presets.js casual       # 仅合成 casual 3 段
 *   node scripts/synth-presets.js casual 0     # 仅合成 casual-0
 *
 * 文本如需重新生成 / 调整：直接改 lib/presetReplies.ts 然后重跑本脚本
 * ============================================================
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_VOICES_DIR = path.join(ROOT, "public", "preset-voices");
const PRESETS_TS = path.join(ROOT, "lib", "presetReplies.ts");

// ---- 1. 加载 .env.local ----
function loadEnv() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("❌ .env.local 不存在");
    process.exit(1);
  }
  const text = fs.readFileSync(envPath, "utf-8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    )
      val = val.slice(1, -1);
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnv();

// ---- 2. 音色配置（与 lib/volcano-tts.ts 严格保持一致） ----
const VOICE_CONFIG = {
  casual: {
    speaker: "zh_female_qingchezizi_uranus_bigtts",
    resourceId: "seed-tts-2.0",
    emotion: "neutral",
    speech_rate: 30,
    displayName: "清澈梓梓",
  },
  rational: {
    speaker: "zh_female_lingling_uranus_bigtts",
    resourceId: "seed-tts-2.0",
    emotion: "calm",
    speech_rate: 30,
    displayName: "玲玲",
  },
  scathing: {
    speaker: "ICL_zh_female_aojiaonvyou_tob",
    resourceId: "seed-tts-1.0",
    emotion: "coldness",
    speech_rate: 25,
    displayName: "傲娇女友",
  },
};

const VOLC_URL = "https://openspeech.bytedance.com/api/v3/tts/unidirectional";

// ---- 3. 火山 TTS 合成（NDJSON 流解析） ----
async function volcanoSynth(text, mode) {
  const apiKey = process.env.VOLC_API_KEY;
  if (!apiKey) throw new Error("VOLC_API_KEY 未设置");
  const cfg = VOICE_CONFIG[mode];

  const res = await fetch(VOLC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
      "X-Api-Resource-Id": cfg.resourceId,
    },
    body: JSON.stringify({
      user: { uid: "xingxing-ink-preset" },
      req_params: {
        text,
        speaker: cfg.speaker,
        audio_params: {
          format: "mp3",
          sample_rate: 24000,
          emotion: cfg.emotion,
          speech_rate: cfg.speech_rate,
        },
      },
    }),
  });

  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => "");
    throw new Error(`volcano ${res.status}: ${t}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  const chunks = [];
  let buf = "";
  let lastErr = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      try {
        const obj = JSON.parse(line);
        if (obj.code === 0 && typeof obj.data === "string" && obj.data) {
          chunks.push(Buffer.from(obj.data, "base64"));
        } else if (obj.code === 20000000) {
          // done
        } else if (typeof obj.code === "number" && obj.code !== 0) {
          lastErr = obj;
        }
      } catch {
        /* skip */
      }
    }
  }
  // tail
  const tail = buf.trim();
  if (tail) {
    try {
      const obj = JSON.parse(tail);
      if (obj.code === 0 && typeof obj.data === "string" && obj.data) {
        chunks.push(Buffer.from(obj.data, "base64"));
      }
    } catch {}
  }
  if (chunks.length === 0) {
    throw new Error(
      `volcano 无音频返回${lastErr ? `：code=${lastErr.code} msg=${lastErr.message}` : ""}`
    );
  }
  return Buffer.concat(chunks);
}

// ---- 4. 从 lib/presetReplies.ts 解析 9 条 ----
/**
 * 这里直接 require 是不行的（.ts 文件 + import type），
 * 用纯文本 + 正则解析比较稳。
 *
 * 文件结构稳定为：
 *   trigger: "...",
 *   reply: `...`,           ← template literal，可能多行
 *   audio: "/preset-voices/...",
 */
function loadPresets() {
  const txt = fs.readFileSync(PRESETS_TS, "utf-8");
  const blockRe = /\{\s*\/\/[^\n]*\n?\s*trigger:\s*"([^"]+)"\s*,\s*reply:\s*`([\s\S]+?)`\s*,\s*audio:\s*"([^"]+)"\s*,?\s*\}/g;
  const simpleRe = /\{\s*trigger:\s*"([^"]+)"\s*,\s*reply:\s*`([\s\S]+?)`\s*,\s*audio:\s*"([^"]+)"\s*,?\s*\}/g;

  const items = [];
  // 先匹配带前置注释的，再匹配纯净的
  const seen = new Set();
  for (const m of txt.matchAll(blockRe)) {
    const key = `${m[1]}|||${m[3]}`;
    if (!seen.has(key)) {
      seen.add(key);
      items.push({ trigger: m[1], reply: m[2], audio: m[3] });
    }
  }
  for (const m of txt.matchAll(simpleRe)) {
    const key = `${m[1]}|||${m[3]}`;
    if (!seen.has(key)) {
      seen.add(key);
      items.push({ trigger: m[1], reply: m[2], audio: m[3] });
    }
  }

  // 推断 mode（按 audio 路径前缀）
  return items.map((it) => {
    const m = it.audio.match(/\/preset-voices\/(casual|rational|scathing)-(\d+)\.mp3/);
    if (!m) throw new Error(`无法解析 mode/index from audio: ${it.audio}`);
    return { ...it, mode: m[1], index: parseInt(m[2], 10) };
  });
}

// ---- 5. 主流程 ----
async function main() {
  const args = process.argv.slice(2);
  const onlyMode = args.find((a) =>
    ["casual", "rational", "scathing"].includes(a)
  );
  const onlyIdxRaw = args.find((a) => /^[0-2]$/.test(a));
  const onlyIdx = onlyIdxRaw ? parseInt(onlyIdxRaw, 10) : null;

  if (!fs.existsSync(PUBLIC_VOICES_DIR)) {
    fs.mkdirSync(PUBLIC_VOICES_DIR, { recursive: true });
  }

  const presets = loadPresets();
  console.log(`📖 解析到 ${presets.length} 条预制（来源：${PRESETS_TS}）`);

  const filtered = presets.filter((p) => {
    if (onlyMode && p.mode !== onlyMode) return false;
    if (onlyIdx !== null && p.index !== onlyIdx) return false;
    return true;
  });

  console.log(`🎯 本次合成：${filtered.length} 段\n`);

  const results = [];
  for (const p of filtered) {
    const cfg = VOICE_CONFIG[p.mode];
    const fileName = `${p.mode}-${p.index}.mp3`;
    const absPath = path.join(PUBLIC_VOICES_DIR, fileName);
    const charCount = [...p.reply].length;
    console.log(
      `🎤 ${p.mode}-${p.index} (${cfg.displayName}) · ${charCount}字`
    );
    console.log(`   trigger: ${p.trigger}`);

    try {
      const t0 = Date.now();
      const mp3 = await volcanoSynth(p.reply, p.mode);
      fs.writeFileSync(absPath, mp3);
      const sizeKB = (mp3.length / 1024).toFixed(1);
      const dt = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`   ✅ ${fileName}（${sizeKB} KB / ${dt}s）\n`);
      results.push({ ok: true, file: fileName, size: mp3.length });
    } catch (e) {
      console.error(`   ❌ 失败：${e.message}\n`);
      results.push({ ok: false, file: fileName, error: e.message });
    }
  }

  console.log(`═════════════════════════════════════`);
  const okCount = results.filter((r) => r.ok).length;
  const totalKB = (
    results.filter((r) => r.ok).reduce((s, r) => s + r.size, 0) / 1024
  ).toFixed(1);
  console.log(`✅ 成功 ${okCount}/${filtered.length} 段，总大小 ${totalKB} KB`);
  console.log(`📁 ${PUBLIC_VOICES_DIR}`);
  console.log(`═════════════════════════════════════`);

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.log(`\n❌ 失败列表：`);
    for (const f of failed) console.log(`   ${f.file}: ${f.error}`);
    process.exit(2);
  }
}

main().catch((e) => {
  console.error("\n💥 脚本崩溃：", e);
  process.exit(1);
});
