"use client";

import { useEffect, useRef, useState } from "react";

interface MicInputProps {
  /** 识别完成后回传文字（一次完整识别一次） */
  onTranscript: (text: string) => void;
  /** 禁用（如 streaming 时不让录） */
  disabled?: boolean;
}

/**
 * 浏览器原生 Web Speech Recognition 类型声明（避免依赖 @types/dom-speech-recognition）
 */
type AnySpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((ev: { results: ArrayLike<{ 0: { transcript: string } }> }) => void)
    | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

/**
 * 长按录音、松开识别麦克风按钮。
 *
 * 设计：
 * - 默认 idle 灰色；按住时金色脉动；松开后短暂显示"识别中…"
 * - iOS Safari 与多数桌面浏览器支持，不支持时自动 hidden（不影响打字）
 * - 单次识别（continuous=false / interimResults=false），回传最终一段
 * - HTTPS only：localhost 也算安全源；线上 vercel 自动 HTTPS
 */
export function MicInput({ onTranscript, disabled }: MicInputProps) {
  const [supported, setSupported] = useState<boolean>(false);
  const [recording, setRecording] = useState(false);
  const [recognizing, setRecognizing] = useState(false); // 松开后短暂显示
  const recogRef = useRef<AnySpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR =
      (
        window as unknown as {
          SpeechRecognition?: new () => AnySpeechRecognition;
          webkitSpeechRecognition?: new () => AnySpeechRecognition;
        }
      ).SpeechRecognition ||
      (
        window as unknown as {
          webkitSpeechRecognition?: new () => AnySpeechRecognition;
        }
      ).webkitSpeechRecognition;
    setSupported(!!SR);
  }, []);

  function startRecording() {
    if (disabled || recording) return;
    if (typeof window === "undefined") return;

    const SR =
      (
        window as unknown as {
          SpeechRecognition?: new () => AnySpeechRecognition;
          webkitSpeechRecognition?: new () => AnySpeechRecognition;
        }
      ).SpeechRecognition ||
      (
        window as unknown as {
          webkitSpeechRecognition?: new () => AnySpeechRecognition;
        }
      ).webkitSpeechRecognition;
    if (!SR) return;

    try {
      const recognition = new SR();
      recognition.lang = "zh-CN";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (ev) => {
        let combined = "";
        // 把所有 results 拼起来（通常只有一段）
        for (let i = 0; i < ev.results.length; i++) {
          combined += ev.results[i][0].transcript;
        }
        const finalText = combined.trim();
        if (finalText) onTranscript(finalText);
      };

      recognition.onerror = () => {
        setRecording(false);
        setRecognizing(false);
      };

      recognition.onend = () => {
        setRecording(false);
        setRecognizing(false);
      };

      recogRef.current = recognition;
      recognition.start();
      setRecording(true);
    } catch {
      // 启动失败（权限拒绝等）
      setRecording(false);
    }
  }

  function stopRecording() {
    if (!recording) return;
    setRecording(false);
    setRecognizing(true);
    try {
      recogRef.current?.stop();
    } catch {
      /* ignore */
    }
  }

  // 鼠标/触摸离开时也松手（防卡死）
  useEffect(() => {
    if (!recording) return;
    function up() {
      stopRecording();
    }
    window.addEventListener("mouseup", up);
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchend", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  if (!supported) return null;

  const tooltip = recording
    ? "正在听……松手识别"
    : recognizing
    ? "识别中……"
    : "按住说话";

  return (
    <button
      type="button"
      aria-label={tooltip}
      title={tooltip}
      disabled={disabled || recognizing}
      onMouseDown={(e) => {
        e.preventDefault();
        startRecording();
      }}
      onTouchStart={(e) => {
        e.preventDefault();
        startRecording();
      }}
      onContextMenu={(e) => e.preventDefault()}
      className={[
        "shrink-0 inline-flex items-center justify-center rounded-md w-9 h-9 transition-all select-none",
        disabled
          ? "border border-xx-border text-xx-text-dim opacity-50 cursor-not-allowed"
          : recording
          ? "bg-xx-gold text-xx-bg shadow-[0_0_0_3px_rgba(184,138,79,0.25)] mic-pulse"
          : recognizing
          ? "border border-xx-gold text-xx-gold animate-pulse"
          : "border border-xx-border text-xx-text-dim hover:border-xx-gold hover:text-xx-gold",
      ].join(" ")}
    >
      {/* 麦克风 SVG */}
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="9" y="2" width="6" height="12" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0" />
        <path d="M12 18v3" />
        <path d="M8 22h8" />
      </svg>
    </button>
  );
}
