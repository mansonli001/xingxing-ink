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
 * 检测"当前浏览器的 Web Speech API 实际上不能用"——包括：
 *   1. iPhone / iPad Safari（苹果多年静默失败 bug）
 *   2. iPadOS 上伪装 Mac 的 Safari
 *   3. 任何 iOS 上的"套壳浏览器"（Chrome/Firefox/Edge/微信 都被强制 WebKit）
 *   4. 微信内嵌浏览器（桌面/移动均无麦克风录音权限）
 *   5. 其他内嵌 WebView（抖音/微博/飞书/QQ）
 *
 * 为什么要单独处理：即使 window.webkitSpeechRecognition 对象存在，
 * 这些环境里调用 .start() 几乎 100% 静默失败——与其显示一个"假"按钮让用户困惑，
 * 不如直接隐藏。
 *
 * localStorage 里持久化"曾经失败过"——若按钮被点击过但识别失败，下次访问直接不渲染。
 */
function isKnownUnsupported(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return false;
  }
  const ua = navigator.userAgent || "";

  // 1. iPhone/iPad/iPod UA 特征
  if (/iP(ad|hone|od)/i.test(ua)) return true;
  // 2. iPadOS 上伪装 Mac 的触屏 Safari
  if (
    navigator.platform === "MacIntel" &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1
  ) {
    return true;
  }
  // 3. 微信内嵌浏览器（无论 Android/iOS，都不走原生 Web Speech API）
  if (/MicroMessenger/i.test(ua)) return true;
  // 4. 其它常见内嵌 WebView
  if (/QQ\/|Weibo|TikTok|AlipayClient|DingTalk|FeishuLark|Lark/i.test(ua)) {
    return true;
  }
  // 5. 上次访问里失败过 → 记住，直接不渲染
  try {
    if (window.localStorage.getItem("mic-sr-broken") === "1") return true;
  } catch {
    /* 隐私模式可能拒绝 localStorage，忽略 */
  }
  return false;
}

/** 把"此浏览器确认不能用"持久化到 localStorage，下次直接隐藏 */
function markSRBroken() {
  try {
    window.localStorage.setItem("mic-sr-broken", "1");
  } catch {
    /* 忽略 */
  }
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
  const silentFailTimerRef = useRef<number | null>(null);
  const gotAnyResponseRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // v0.4.2.3: 多层防御——UA 检测 + 微信检测 + localStorage 记忆
    // 任何已知不支持的环境，按钮直接不渲染
    if (isKnownUnsupported()) {
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
        gotAnyResponseRef.current = true;
        let combined = "";
        for (let i = 0; i < ev.results.length; i++) {
          combined += ev.results[i][0].transcript;
        }
        const finalText = combined.trim();
        if (finalText) onTranscript(finalText);
      };

      recognition.onerror = (ev) => {
        gotAnyResponseRef.current = true;
        setRecording(false);
        setRecognizing(false);
        // 常见 error 类型：not-allowed / no-speech / audio-capture / network / aborted
        const errType = ev?.error || "unknown";
        if (errType === "not-allowed") {
          setErrorHint("请允许麦克风权限（设置里）");
          // not-allowed 可能是用户暂时拒绝，先不持久化
        } else if (errType === "no-speech") {
          setErrorHint("没听到内容，再说一遍");
        } else if (errType === "audio-capture") {
          setErrorHint("此浏览器不支持录音，下次将隐藏");
          markSRBroken(); // 环境问题，持久化
          setSupported(false); // 本次也立刻隐藏
        } else if (errType === "network") {
          setErrorHint("网络问题，识别失败");
        } else if (errType === "service-not-allowed") {
          setErrorHint("此环境不支持语音识别");
          markSRBroken();
          setSupported(false);
        } else if (errType !== "aborted") {
          setErrorHint(`识别失败：${errType}`);
        }
        // 3 秒后清掉提示
        window.setTimeout(() => setErrorHint(""), 3000);
      };

      recognition.onend = () => {
        gotAnyResponseRef.current = true;
        setRecording(false);
        setRecognizing(false);
      };

      recogRef.current = recognition;
      gotAnyResponseRef.current = false;
      recognition.start();
      setRecording(true);

      // Watchdog：点击后 4 秒内如果既没 result 也没 error 也没 end
      // → 说明此浏览器静默失败，永久隐藏按钮
      if (silentFailTimerRef.current) {
        window.clearTimeout(silentFailTimerRef.current);
      }
      silentFailTimerRef.current = window.setTimeout(() => {
        if (!gotAnyResponseRef.current) {
          // 静默失败！标记 + 隐藏
          markSRBroken();
          setSupported(false);
          setRecording(false);
          setErrorHint("此浏览器不支持语音识别，已隐藏");
          window.setTimeout(() => setErrorHint(""), 3000);
          try {
            recogRef.current?.abort();
          } catch {
            /* ignore */
          }
        }
      }, 4000);
    } catch (e) {
      setRecording(false);
      // start() 直接抛错——通常也是环境问题（如微信内嵌 WebView）
      markSRBroken();
      setSupported(false);
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
