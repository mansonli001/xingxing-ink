"use client";

import { useEffect, useRef, useState } from "react";

/** 三档人设 ID（和 lib/volcano-tts.ts 保持一致） */
export type AudioMode = "casual" | "rational" | "scathing";

interface AudioPlayerProps {
  /** 完整文本，组件内部调 /api/tts 合成 */
  text: string;
  /** 当前对话模式，决定音色（随便聊/讲道理/扇巴掌） */
  mode?: AudioMode;
  /** 是否自动播放（MVP 不自动播，默认 false） */
  autoPlay?: boolean;
  /** 对外暴露播放状态：true=正在播，false=未播/暂停/结束。供上层触发人像呼吸动效 */
  onPlayingChange?: (playing: boolean) => void;
}

type Status = "idle" | "loading" | "ready" | "playing" | "error";

/** 按钮文案按 mode 切换（贴合三档人设花名） */
const MODE_LABELS: Record<
  AudioMode,
  { idle: string; playing: string }
> = {
  casual: { idle: "▶ 听北京大妞", playing: "♪ 北京大妞正在说" },
  rational: { idle: "▶ 听清冷阿梦", playing: "♪ 清冷阿梦正在说" },
  scathing: { idle: "▶ 听高冷御姐", playing: "♪ 高冷御姐正在说" },
};

export function AudioPlayer({
  text,
  mode = "casual",
  autoPlay = false,
  onPlayingChange,
}: AudioPlayerProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const triedAutoPlay = useRef(false);

  // 播放状态变化时主动通知上层
  useEffect(() => {
    onPlayingChange?.(status === "playing");
    // 仅在 status 变化时触发，onPlayingChange 可能 ref 不稳定，故不放依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function generate() {
    if (status === "loading") return;
    setStatus("loading");
    setErrorMsg("");
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
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      if (audioRef.current) {
        audioRef.current.src = url;
        await audioRef.current.play().catch(() => {});
      }
      setStatus("playing");
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "TTS 失败");
    }
  }

  useEffect(() => {
    if (autoPlay && !triedAutoPlay.current && text.length > 0) {
      triedAutoPlay.current = true;
      generate();
    }
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, text]);

  const labels = MODE_LABELS[mode];
  const mainLabel =
    status === "loading"
      ? "正在熬一遍……"
      : status === "playing"
      ? labels.playing
      : status === "error"
      ? "♻ 重试"
      : labels.idle;

  return (
    <div className="flex items-center gap-2 mt-2 text-xs text-xx-text-dim">
      <button
        type="button"
        onClick={generate}
        disabled={status === "loading"}
        className={[
          "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 transition-colors",
          status === "error"
            ? "border-xx-red text-xx-red"
            : "border-xx-border hover:border-xx-gold hover:text-xx-gold",
          status === "loading" ? "opacity-60 cursor-wait" : "",
        ].join(" ")}
      >
        <span
          className={
            status === "loading"
              ? "animate-pulse"
              : status === "playing"
              ? "text-xx-gold"
              : ""
          }
        >
          {mainLabel}
        </span>
      </button>
      <audio
        ref={audioRef}
        controls
        className={status === "idle" || status === "loading" ? "hidden" : ""}
        onEnded={() => setStatus("ready")}
        onPlay={() => setStatus("playing")}
        onPause={() =>
          setStatus((s) => (s === "playing" ? "ready" : s))
        }
        onError={() => {
          setStatus("error");
          setErrorMsg("音频播放失败");
        }}
      />
      {errorMsg ? (
        <span className="text-xx-red text-xs ml-1">{errorMsg}</span>
      ) : null}
    </div>
  );
}
