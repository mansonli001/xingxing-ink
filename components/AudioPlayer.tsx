"use client";

import { useEffect, useRef, useState } from "react";

/** 三档人设 ID（和 lib/volcano-tts.ts 保持一致） */
export type AudioMode = "casual" | "rational" | "scathing";

interface AudioPlayerProps {
  /** 完整文本，组件内部调 /api/tts 合成（除非传了 presetAudioUrl） */
  text: string;
  /** 当前对话模式，决定音色（随便聊/讲道理/扇巴掌） */
  mode?: AudioMode;
  /** 是否自动播放（MVP 不自动播，默认 false） */
  autoPlay?: boolean;
  /** 对外暴露播放状态：true=正在播，false=未播/暂停/结束。供上层触发人像呼吸动效 */
  onPlayingChange?: (playing: boolean) => void;
  /**
   * v0.4.2：预制音频直链（如 /preset-voices/casual-0.mp3）。
   * 传了就直接播放该 URL，跳过 /api/tts 合成（0 延迟、0 API 开销）。
   */
  presetAudioUrl?: string;
}

/**
 * v0.4.2.5：新增 "paused" 状态，支持暂停/继续。
 *   idle → loading → playing ⇄ paused → ended（→ idle 或 → 重播）
 */
type Status =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "ended"
  | "error";

/* ------------------------------------------------------------------
 * v0.4.1 模块级 Blob 缓存（v0.4.2.5 完整保留，一行不动）
 * key = `${mode}::${textHash}::${textLength}`
 * value = blob URL（已 createObjectURL，可直接给 audio.src）
 * 命中：第二次点击 0 延迟立即播放
 * 单次会话内有效（页面刷新即清空），最多 50 条 FIFO 淘汰
 * ----------------------------------------------------------------- */
const MAX_CACHE = 50;
const blobCache = new Map<string, string>();

function djb2Hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function getCacheKey(mode: AudioMode, text: string): string {
  return `${mode}::${djb2Hash(text)}::${text.length}`;
}

function setCache(key: string, url: string) {
  if (blobCache.size >= MAX_CACHE) {
    const firstKey = blobCache.keys().next().value;
    if (firstKey) {
      const oldUrl = blobCache.get(firstKey);
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      blobCache.delete(firstKey);
    }
  }
  blobCache.set(key, url);
}

/** 把秒数格式化成 "0:12" / "1:05" */
function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** v0.6.1：微信语音风格头像——用聊天区大图（848x1264）裁脸，比 mini-avatar 大一圈 */
const WX_AVATAR_SRC: Record<AudioMode, string> = {
  casual: "/silhouettes/casual.png",
  rational: "/silhouettes/rational.png",
  scathing: "/silhouettes/scathing.png",
};

export function AudioPlayer({
  text,
  mode = "casual",
  autoPlay = false,
  onPlayingChange,
  presetAudioUrl,
}: AudioPlayerProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const triedAutoPlay = useRef(false);

  // 播放状态变化时通知上层（playing/paused 都算"在播"，让人像继续呼吸最自然
  // 但当前需求里只有"她在说话"才呼吸，因此只在 playing 时为 true）
  useEffect(() => {
    onPlayingChange?.(status === "playing");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  /** 加载音频源（预制直链或 TTS 合成 + 缓存命中） */
  async function loadAndPlay() {
    if (status === "loading") return;
    setErrorMsg("");

    const audio = audioRef.current;
    if (!audio) return;

    // v0.4.2：预制音频路径优先（跳过 /api/tts）
    if (presetAudioUrl) {
      if (audio.src !== window.location.origin + presetAudioUrl) {
        audio.src = presetAudioUrl;
      }
      try {
        await audio.play();
        setStatus("playing");
      } catch {
        setStatus("error");
        setErrorMsg("浏览器拒绝自动播放，请再点一次");
      }
      return;
    }

    const cacheKey = getCacheKey(mode, text);
    const cachedUrl = blobCache.get(cacheKey);

    // 缓存命中：0 延迟
    if (cachedUrl) {
      if (audio.src !== cachedUrl) audio.src = cachedUrl;
      try {
        await audio.play();
        setStatus("playing");
      } catch {
        setStatus("error");
        setErrorMsg("浏览器拒绝自动播放，请再点一次");
      }
      return;
    }

    // 缓存未命中：去 /api/tts 合成
    setStatus("loading");
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, mode }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "TTS 失败" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setCache(cacheKey, url);
      audio.src = url;
      await audio.play().catch(() => {});
      setStatus("playing");
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "TTS 失败");
    }
  }

  /** 暂停 */
  function pause() {
    audioRef.current?.pause();
    setStatus("paused");
  }

  /** 继续 / ended 后重播 / error 后重试 */
  async function resumeOrReplay() {
    const audio = audioRef.current;
    if (!audio) return;

    // ended 后从头重播（src 已存在）
    if (status === "ended" && audio.src) {
      audio.currentTime = 0;
      try {
        await audio.play();
        setStatus("playing");
      } catch {
        /* ignore */
      }
      return;
    }
    // paused 继续
    if (status === "paused" && audio.src) {
      try {
        await audio.play();
        setStatus("playing");
      } catch {
        /* ignore */
      }
      return;
    }
    // error / idle / loading 重新加载
    loadAndPlay();
  }

  // autoPlay 触发
  useEffect(() => {
    if (autoPlay && !triedAutoPlay.current && text.length > 0) {
      triedAutoPlay.current = true;
      loadAndPlay();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, text]);

  // 主按钮（最左）：根据状态切换 label + 行为
  function MainButton() {
    if (status === "loading") {
      return (
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-1.5 rounded-md border border-xx-border/60 px-2.5 py-1 text-[12px] text-xx-text-dim opacity-70 cursor-wait animate-pulse"
        >
          ✦ 正在熬一遍…
        </button>
      );
    }

    if (status === "playing") {
      // 暂停按钮（紧凑 28×28）
      return (
        <button
          type="button"
          onClick={pause}
          aria-label="暂停"
          title="暂停"
          className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-xx-gold/60 text-xx-gold hover:bg-xx-gold/10 transition-colors shrink-0"
        >
          <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        </button>
      );
    }

    if (status === "paused") {
      // 继续按钮（紧凑 28×28）
      return (
        <button
          type="button"
          onClick={resumeOrReplay}
          aria-label="继续"
          title="继续"
          className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-xx-gold/60 text-xx-gold hover:bg-xx-gold/10 transition-colors shrink-0"
        >
          <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor" aria-hidden="true">
            <path d="M7 5v14l12-7z" />
          </svg>
        </button>
      );
    }

    if (status === "ended") {
      return (
        <button
          type="button"
          onClick={resumeOrReplay}
          className="inline-flex items-center gap-1.5 rounded-md border border-xx-border/60 hover:border-xx-gold hover:text-xx-gold px-2.5 py-1 text-[12px] text-xx-text-dim transition-colors"
        >
          ▶ 再听一遍姐姐的
        </button>
      );
    }

    if (status === "error") {
      return (
        <button
          type="button"
          onClick={resumeOrReplay}
          className="inline-flex items-center gap-1.5 rounded-md border border-xx-red text-xx-red px-2.5 py-1 text-[12px] hover:bg-xx-red/10 transition-colors"
        >
          ♻ 重试
        </button>
      );
    }

    // idle
    return (
      <button
        type="button"
        onClick={loadAndPlay}
        className="inline-flex items-center gap-1.5 rounded-md border border-xx-border/60 hover:border-xx-gold hover:text-xx-gold px-2.5 py-1 text-[12px] text-xx-text-dim transition-colors"
      >
        ▶ 听姐姐的语音
      </button>
    );
  }

  // 进度条 + 时间戳：playing / paused 状态下显示，半透明融入气泡
  const showProgress = status === "playing" || status === "paused";
  const progressPct =
    duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      {/* v0.6.1：微信语音风格头像（点击 = 同主按钮行为，高清半身大图裁脸） */}
      <button
        type="button"
        onClick={status === "playing" ? pause : resumeOrReplay}
        aria-label={status === "playing" ? "暂停姐姐的语音" : "听姐姐的语音"}
        title={status === "playing" ? "暂停" : "听姐姐的语音"}
        className="wx-avatar-btn"
        data-speaking={status === "playing" ? "true" : "false"}
      >
        <img
          src={WX_AVATAR_SRC[mode]}
          alt=""
          className="wx-avatar-img"
          loading="lazy"
        />
      </button>

      <MainButton />

      {/* 进度条（半透明 1px 金色细线，flex-wrap 时手机端不溢出气泡） */}
      {showProgress && (
        <>
          <div className="flex-1 min-w-[60px] max-w-full h-px bg-xx-border/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-xx-gold/70 transition-[width] duration-200 ease-linear"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-[10px] text-xx-text-dim/80 tabular-nums shrink-0">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </>
      )}

      {/* 错误文案（在状态为 error 时显示，不破坏布局） */}
      {status === "error" && errorMsg && (
        <span className="text-[11px] text-xx-red/80 shrink-0">{errorMsg}</span>
      )}

      {/* 隐藏的 audio 播放引擎——永久 hidden，无 controls，纯靠 React state 驱动 UI */}
      <audio
        ref={audioRef}
        className="hidden"
        preload="metadata"
        onLoadedMetadata={(e) => {
          const a = e.currentTarget;
          if (Number.isFinite(a.duration)) setDuration(a.duration);
        }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onEnded={() => {
          setStatus("ended");
          setCurrentTime(0);
        }}
        onPlay={() => setStatus("playing")}
        onPause={() => {
          // onPause 会在 ended 时也触发；只有当前状态是 playing 时才转 paused
          setStatus((s) => (s === "playing" ? "paused" : s));
        }}
        onError={() => {
          setStatus("error");
          setErrorMsg("音频播放失败");
        }}
      />
    </div>
  );
}
