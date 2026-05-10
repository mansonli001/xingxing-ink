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
 * 检测 iPhone / iPad Safari（含 iPadOS 上伪装 Mac 的 Safari）
 *
 * 为什么要单独处理：即使 iOS Safari 暴露了 `webkitSpeechRecognition` 对象，
 * 实际调用 .start() 时**几乎 100% 静默失败**——这是苹果多年未修的 bug。
 * 与其显示一个"假"按钮让用户困惑，不如直接隐藏，引导用键盘麦克风。
 */
function isIOSSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iP(ad|hone|od)/.test(ua);
  const iPadOSSafariDesktopMode =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOS || iPadOSSafariDesktopMode;
}

/**
 * 长按录音、松开识别麦克风按钮。
 *
 * v0.4.2.2 修复 iPhone 静默失败：
 * - iOS Safari 不再渲染按钮（Web Speech API 实际不工作，引导用键盘语音输入）
 * - 其它平台：保留原有长按录音 / 松开识别
 * - 识别失败时，toast 提示"换用键盘语音输入"
 */
export function MicInput({ onTranscript, disabled }: MicInputProps) {
  const [supported, setSupported] = useState<boolean>(false);
  const [recording, setRecording] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [errorHint, setErrorHint] = useState<string>("");
  const recogRef = useRef<AnySpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // v0.4.2.2: iPhone/iPad Safari 直接判为不支持
    // （API 存在但调用必定静默失败——多年苹果 bug，不如不显示）
    if (isIOSSafari()) {
      setSupported(false);
      return;
    }

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
    setErrorHint("");

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
    if (!SR) {
      setErrorHint("浏览器不支持语音识别");
      return;
    }

    try {
      const recognition = new SR();
      recognition.lang = "zh-CN";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (ev) => {
        let combined = "";
        for (let i = 0; i < ev.results.length; i++) {
          combined += ev.results[i][0].transcript;
        }
        const finalText = combined.trim();
        if (finalText) onTranscript(finalText);
      };

      recognition.onerror = (ev) => {
        setRecording(false);
        setRecognizing(false);
        // 常见 error 类型：not-allowed / no-speech / audio-capture / network / aborted
        const errType = ev?.error || "unknown";
        if (errType === "not-allowed") {
          setErrorHint("请允许麦克风权限（设置里）");
        } else if (errType === "no-speech") {
          setErrorHint("没听到内容，再说一遍");
        } else if (errType === "audio-capture") {
          setErrorHint("没找到麦克风设备");
        } else if (errType === "network") {
          setErrorHint("网络问题，识别失败");
        } else if (errType !== "aborted") {
          setErrorHint(`识别失败：${errType}`);
        }
        // 3 秒后清掉提示
        window.setTimeout(() => setErrorHint(""), 3000);
      };

      recognition.onend = () => {
        setRecording(false);
        setRecognizing(false);
      };

      recogRef.current = recognition;
      recognition.start();
      setRecording(true);
    } catch (e) {
      setRecording(false);
      setErrorHint(
        e instanceof Error ? `启动失败：${e.message}` : "启动失败"
      );
      window.setTimeout(() => setErrorHint(""), 3000);
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
    window.addEventListener("touchcancel", up);
    return () => {
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchend", up);
      window.removeEventListener("touchcancel", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  // iOS Safari / 其它不支持 → 直接不渲染按钮
  if (!supported) return null;

  const tooltip = recording
    ? "正在听……松手识别"
    : recognizing
    ? "识别中……"
    : errorHint
    ? errorHint
    : "按住说话";

  return (
    <div className="relative shrink-0">
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
          "inline-flex items-center justify-center rounded-md w-9 h-9 transition-all select-none",
          disabled
            ? "border border-xx-border text-xx-text-dim opacity-50 cursor-not-allowed"
            : recording
            ? "bg-xx-gold text-xx-bg shadow-[0_0_0_3px_rgba(184,138,79,0.25)] mic-pulse"
            : recognizing
            ? "border border-xx-gold text-xx-gold animate-pulse"
            : errorHint
            ? "border border-xx-red text-xx-red"
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
      {errorHint ? (
        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs bg-xx-bg-2 border border-xx-red text-xx-red rounded px-2 py-1 pointer-events-none">
          {errorHint}
        </div>
      ) : null}
    </div>
  );
}
