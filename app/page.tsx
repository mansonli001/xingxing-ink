import { ChatShell } from "@/components/ChatShell";

export default function Home() {
  return (
    <main className="h-[100dvh] w-full bg-xx-bg flex flex-col">
      <header className="relative z-20 border-b border-xx-border px-3 sm:px-6 py-3 flex items-center justify-between gap-2 bg-xx-bg/85 backdrop-blur-md">
        <div className="flex items-baseline gap-2 sm:gap-3 min-w-0 flex-1">
          <span className="logo-serif text-2xl sm:text-[26px] leading-none shrink-0">
            醒醒
          </span>
          <span className="hero-slogan text-xx-rose/85 font-serif min-w-0 truncate">
            姐替你把想法熬一遍
          </span>
          <span className="hidden md:inline text-[11px] text-xx-text-dim font-serif tracking-[0.25em] italic opacity-70 shrink-0">
            · 别做梦了
          </span>
        </div>
        <a
          href="https://xingxing.ink"
          target="_blank"
          rel="noreferrer"
          className="text-[10px] sm:text-[11px] text-xx-text-dim hover:text-xx-gold tracking-[0.2em] sm:tracking-[0.35em] font-display font-semibold transition-colors shrink-0"
        >
          XINGXING.INK
        </a>
      </header>
      <div className="flex-1 overflow-hidden">
        <ChatShell />
      </div>
    </main>
  );
}
