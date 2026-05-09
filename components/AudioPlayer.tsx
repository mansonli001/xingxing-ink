"use client";

import { useEffect, useRef, useState } from "react";

interface AudioPlayerProps {
  /** 完整文本，组件内部调 /api/tts 合成 */
  text: string;
  /** 是否自动播放（文字渲染完成时触发） */
  autoPlay?: boolean;
}

type Status = "idle" | "loading" | "ready" | "playing" | "error";

export function AudioPlayer({ text, autoPlay = false }: AudioPlayerProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const triedAutoPlay = useRef(false);

  async function generate() {
    if (status === "loading") return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
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
          {status === "loading"
            ? "御姐准备中…"
            : status === "playing"
            ? "♪ 醒醒在说话"
            : status === "error"
            ? "♻ 重试"
            : "▶ 听御姐版"}
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
