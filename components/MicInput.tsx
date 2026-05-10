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
type SRResult = {
  isFinal: boolean;
  0: { transcript: string };
};
type AnySpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((ev: { results: ArrayLike<SRResult>; resultIndex: number }) => void)
    | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

/**
 * v0.4.2.4：检测"原生 Web Speech API 在此环境不可用"——
 * 不再隐藏按钮；改为：返回 reason 让 UI 提供引导文案。
 *
 * 不可用包括：
 *   1. iPhone / iPad Safari（苹果多年静默失败 bug）
 *   2. iPadOS 上伪装 Mac 的触屏 Safari
 *   3. 任何 iOS 上的"套壳浏览器"
 *   4. 微信内嵌浏览器
 *   5. 其他常见内嵌 WebView（QQ/微博/抖音/支付宝/钉钉/飞书）
 */
type UnsupportedReason =
  | "ios"
  | "wechat"
  | "webview"
  | "no-api"
  | "broken-once";

function detectUnsupported(): UnsupportedReason | null {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return null;
  }
  const ua = navigator.userAgent || "";

  // 1. iPhone/iPad/iPod
  if (/iP(ad|hone|od)/i.test(ua)) return "ios";
  // 2. iPadOS 上伪装 Mac 的触屏 Safari
  if (
    navigator.platform === "MacIntel" &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1
  ) {
    return "ios";
  }
  // 3. 微信内嵌浏览器
  if (/MicroMessenger/i.test(ua)) return "wechat";
  // 4. 其它常见内嵌 WebView
  if (/QQ\/|Weibo|TikTok|AlipayClient|DingTalk|FeishuLark|Lark/i.test(ua)) {
    return "webview";
  }
  // 5. 上次访问里失败过 → 记住
  try {
    if (window.localStorage.getItem("mic-sr-broken") === "1") {
      return "broken-once";
    }
  } catch {
    /* 隐私模式可能拒绝 localStorage，忽略 */
  }
  // 6. 没有 API
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
  if (!SR) return "no-api";

  return null;
}

/** 把"此浏览器确认不能用"持久化到 localStorage */
function markSRBroken() {
  try {
    window.localStorage.setItem("mic-sr-broken", "1");
  } catch {
    /* 忽略 */
  }
}

/** 各种"不可用"场景下，点按钮时弹的引导文案（中文，1 句话讲清楚怎么办） */
function getGuideText(reason: UnsupportedReason): string {
  switch (reason) {
    case "ios":
      return "iPhone/iPad 用键盘上的 🎤（长按空格键）";
    case "wechat":
      return "微信里不支持，点右上角浏览器打开";
    case "webview":
      return "内嵌浏览器不支持，外部浏览器打开试试";
    case "broken-once":
      return "上次出错了。如要重试：清浏览器存储后刷新";
    case "no-api":
      return "此浏览器不支持语音输入，请用 Chrome/Edge";
  }
}

/**
 * 长按录音、松开识别麦克风按钮。
 *
 * v0.4.2.4 设计：
 * - 不再隐藏按钮——所有平台都显示
 * - 不可用环境（iOS/微信/...）→ 点击弹引导提示，告诉用户怎么用 iOS 键盘麦克风
 * - PC Chrome 等可用环境 → continuous=true + interimResults=true，
 *   说话停顿不会自动断流，按住能说完整段
 */
export function MicInput({ onTranscript, disabled }: MicInputProps) {
  const [unsupportedReason, setUnsupportedReason] =
    useState<UnsupportedReason | null>(null);
  const [recording, setRecording] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [errorHint, setErrorHint] = useState<string>("");
  const [guideOpen, setGuideOpen] = useState(false);
  const recogRef = useRef<AnySpeechRecognition | null>(null);
  const silentFailTimerRef = useRef<number | null>(null);
  const gotAnyResponseRef = useRef<boolean>(false);
  /** 累积所有 final 转写结果（continuous 模式下会多次 onresult） */
  const finalTranscriptRef = useRef<string>("");
  /**
   * v0.4.2.5 长语音自动续接：
   * Chrome 桌面版 SpeechRecognition 即使 continuous=true，也会在 ~60s 后被
   * 系统自动 onend 切断。我们用「用户按住状态 ref」+「onend 自动重启」绕开：
   * 只要用户手指还按着按钮，onend 后立即 start() 续接，文本累积不复位。
   */
  const isUserHoldingRef = useRef<boolean>(false);
  const restartCountRef = useRef<number>(0);
  const MAX_RESTART = 10; // 上限 10 次（约 10 分钟）防失控

  useEffect(() => {
    if (typeof window === "undefined") return;
    setUnsupportedReason(detectUnsupported());
  }, []);

  /** 不可用环境点击 → 弹引导文案 3.5s */
  function showGuide() {
    setGuideOpen(true);
    window.setTimeout(() => setGuideOpen(false), 3500);
  }

  function startRecording() {
    if (disabled || recording) return;
    if (typeof window === "undefined") return;

    // 不可用环境直接弹引导
    if (unsupportedReason) {
      showGuide();
      return;
    }

    setErrorHint("");
    finalTranscriptRef.current = "";
    // v0.4.2.5：进入录音 → 标记用户按住，重置重启计数
    isUserHoldingRef.current = true;
    restartCountRef.current = 0;

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
      setUnsupportedReason("no-api");
      showGuide();
      return;
    }

    try {
      const recognition = new SR();
      recognition.lang = "zh-CN";
      // v0.4.2.4 Bug1 修复：开启持续监听 + 中间结果
      // → 用户说话中间停顿 1-2 秒不会自动断
      // → 必须主动 stop()（松手或自动 watchdog）才结束
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        gotAnyResponseRef.current = true;
      };

      recognition.onresult = (ev) => {
        gotAnyResponseRef.current = true;
        // 累积所有 final 结果。interim 结果暂时不回传（避免输入框抖动）
        let newFinals = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const result = ev.results[i];
          if (result.isFinal) {
            newFinals += result[0].transcript;
          }
        }
        if (newFinals) {
          finalTranscriptRef.current += newFinals;
        }
      };

      recognition.onerror = (ev) => {
        gotAnyResponseRef.current = true;
        const errType = ev?.error || "unknown";
        // v0.4.2.5：致命错误强制退出自动重启循环，避免错误无限循环
        const fatalErrors = new Set([
          "not-allowed",
          "audio-capture",
          "service-not-allowed",
        ]);
        if (fatalErrors.has(errType)) {
          isUserHoldingRef.current = false;
        }
        setRecording(false);
        setRecognizing(false);
        if (errType === "not-allowed") {
          setErrorHint("请允许麦克风权限（设置里）");
        } else if (errType === "no-speech") {
          // continuous 模式下 no-speech 较少见，发生了不强提示
          setErrorHint("没听到内容，再说一遍");
        } else if (errType === "audio-capture") {
          setErrorHint("没找到麦克风");
          markSRBroken();
          setUnsupportedReason("broken-once");
        } else if (errType === "network") {
          setErrorHint("网络问题，识别失败");
        } else if (errType === "service-not-allowed") {
          setErrorHint("此环境不支持语音识别");
          markSRBroken();
          setUnsupportedReason("broken-once");
        } else if (errType !== "aborted") {
          setErrorHint(`识别失败：${errType}`);
        }
        window.setTimeout(() => setErrorHint(""), 3000);
      };

      recognition.onend = () => {
        gotAnyResponseRef.current = true;
        // v0.4.2.5：长语音自动续接
        // 用户还按着按钮 + 重启次数未超限 → 立即重启，文本累积不复位
        if (
          isUserHoldingRef.current &&
          restartCountRef.current < MAX_RESTART
        ) {
          restartCountRef.current++;
          try {
            recogRef.current?.start();
            // 不复位 recording、不清 finalTranscriptRef、不触发 onTranscript
            return;
          } catch {
            // start() 失败（如同实例不能立刻重 start）→ 走原停止逻辑
            isUserHoldingRef.current = false;
          }
        }
        // 用户已松手 / 达到上限 / 重启失败 → 走原逻辑
        setRecording(false);
        setRecognizing(false);
        const finalText = finalTranscriptRef.current.trim();
        if (finalText) {
          onTranscript(finalText);
        }
        finalTranscriptRef.current = "";
        restartCountRef.current = 0;
      };

      recogRef.current = recognition;
      gotAnyResponseRef.current = false;
      recognition.start();
      setRecording(true);

      // Watchdog：4 秒内既无 onstart 也无 onresult/onerror/onend → 静默失败
      if (silentFailTimerRef.current) {
        window.clearTimeout(silentFailTimerRef.current);
      }
      silentFailTimerRef.current = window.setTimeout(() => {
        if (!gotAnyResponseRef.current) {
          // v0.4.2.5：watchdog 触发也强制退出自动重启循环
          isUserHoldingRef.current = false;
          markSRBroken();
          setUnsupportedReason("broken-once");
          setRecording(false);
          setErrorHint("此浏览器不支持语音识别");
          window.setTimeout(() => setErrorHint(""), 3000);
          try {
            recogRef.current?.abort();
          } catch {
            /* ignore */
          }
        }
      }, 4000);
    } catch (e) {
      // v0.4.2.5：启动失败也退出循环
      isUserHoldingRef.current = false;
      setRecording(false);
      markSRBroken();
      setUnsupportedReason("broken-once");
      setErrorHint(
        e instanceof Error ? `启动失败：${e.message}` : "启动失败"
      );
      window.setTimeout(() => setErrorHint(""), 3000);
    }
  }

  function stopRecording() {
    if (!recording) return;
    // v0.4.2.5：先把 holding 标记设 false，再调 stop()
    // 否则 onend 会误判用户还按着 → 自动重启
    isUserHoldingRef.current = false;
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

  // v0.4.2.4：所有环境都显示按钮——不可用环境点击时弹引导提示

  const tooltip = unsupportedReason
    ? getGuideText(unsupportedReason)
    : recording
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
        onClick={(e) => {
          // 不可用环境也允许触发（兼容 iOS Safari 下没 mousedown 链路的极端情况）
          if (unsupportedReason && !recording) {
            e.preventDefault();
            showGuide();
          }
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
            : unsupportedReason
            ? "border border-xx-border text-xx-text-dim hover:border-xx-gold/60 hover:text-xx-gold/80 opacity-70"
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
      {/* 引导提示气泡（不可用环境点击时显示 3.5s） */}
      {guideOpen && unsupportedReason ? (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs bg-xx-bg-2 border border-xx-gold text-xx-text rounded-md px-3 py-1.5 pointer-events-none shadow-lg z-50">
          {getGuideText(unsupportedReason)}
        </div>
      ) : null}
      {/* 错误提示气泡 */}
      {errorHint ? (
        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs bg-xx-bg-2 border border-xx-red text-xx-red rounded px-2 py-1 pointer-events-none">
          {errorHint}
        </div>
      ) : null}
    </div>
  );
}
