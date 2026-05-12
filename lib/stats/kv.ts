/**
 * 醒醒 · 自建统计 - Upstash Redis 封装（Vercel Marketplace）
 *
 * 设计原则：
 * 1. 生产用真 Redis（Vercel Marketplace → Upstash Integration 后，自动注入
 *    KV_REST_API_URL / KV_REST_API_TOKEN 环境变量，兼容旧 @vercel/kv 命名）
 * 2. 本地开发若没配 → 自动降级到内存 Map，永远不让 API 抛错
 * 3. 所有写入都是 fire-and-forget，统计失败绝不阻塞主流程
 * 4. 读取带短期 CDN 缓存，减少 Redis 命令消耗
 *
 * 免费额度（Upstash Free Tier · 2026-05）：
 *   256 MB · 500K commands/month · 10K commands/day · 256 connections
 * 每天命令预估：访客 200 × 5 轮 = 1000 写 + 200 主页 × 30s 轮询 = 6000 读 → 远低于 10K
 */

import type { Redis } from "@upstash/redis";

// ============================================================
// 1. 检测 KV 是否可用（环境变量注入）
// ============================================================
function hasKvEnv(): boolean {
  return Boolean(
    process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  );
}

// ============================================================
// 2. 内存 fallback（本地开发 / KV 未配置时使用）
//    只是让开发不崩，不保证跨请求共享（serverless 本来就不共享内存）
// ============================================================
type MemStore = {
  kv: Map<string, string | number>;
  sets: Map<string, Set<string>>;
  expires: Map<string, number>; // key -> epoch ms
};

const memStore: MemStore = {
  kv: new Map(),
  sets: new Map(),
  expires: new Map(),
};

function isExpired(key: string): boolean {
  const exp = memStore.expires.get(key);
  if (!exp) return false;
  if (Date.now() > exp) {
    memStore.kv.delete(key);
    memStore.expires.delete(key);
    return true;
  }
  return false;
}

// ============================================================
// 3. 懒加载 @vercel/kv（未配置时不 import，避免 edge 报错）
// ============================================================
type KvClient = {
  incr: (key: string) => Promise<number>;
  incrby: (key: string, by: number) => Promise<number>;
  get: <T = string>(key: string) => Promise<T | null>;
  set: (key: string, val: string | number, opts?: { ex?: number }) => Promise<unknown>;
  sadd: (key: string, member: string) => Promise<number>;
  scard: (key: string) => Promise<number>;
  smembers: (key: string) => Promise<string[]>;
  keys: (pattern: string) => Promise<string[]>;
  del: (key: string) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<number>;
  mget: <T = string>(...keys: string[]) => Promise<(T | null)[]>;
  setMax: (key: string, value: number) => Promise<number>;
};

let cachedClient: KvClient | null = null;

async function getClient(): Promise<KvClient> {
  if (cachedClient) return cachedClient;

  if (hasKvEnv()) {
    const { Redis } = await import("@upstash/redis");
    const k: Redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });
    cachedClient = {
      incr: (key) => k.incr(key),
      incrby: (key, by) => k.incrby(key, by),
      get: async (key) => (await k.get(key)) as unknown as never,
      set: async (key, val, opts) => {
        if (opts?.ex) return k.set(key, val, { ex: opts.ex });
        return k.set(key, val);
      },
      sadd: (key, member) => k.sadd(key, member),
      scard: (key) => k.scard(key),
      smembers: (key) => k.smembers(key),
      keys: (pattern) => k.keys(pattern),
      del: (key) => k.del(key),
      expire: (key, seconds) => k.expire(key, seconds),
      mget: async (...keys) => (await k.mget(...keys)) as unknown as never,
      // Redis 没有原生 setMax，用 get+set 模拟（非原子，够用）
      setMax: async (key, value) => {
        const cur = Number((await k.get(key)) ?? 0);
        if (value > cur) {
          await k.set(key, value);
          return value;
        }
        return cur;
      },
    };
    return cachedClient;
  }

  // ---- 降级内存实现 ----
  cachedClient = {
    incr: async (key) => {
      if (isExpired(key)) memStore.kv.delete(key);
      const cur = Number(memStore.kv.get(key) ?? 0);
      const next = cur + 1;
      memStore.kv.set(key, next);
      return next;
    },
    incrby: async (key, by) => {
      if (isExpired(key)) memStore.kv.delete(key);
      const cur = Number(memStore.kv.get(key) ?? 0);
      const next = cur + by;
      memStore.kv.set(key, next);
      return next;
    },
    get: async (key) => {
      if (isExpired(key)) return null;
      const v = memStore.kv.get(key);
      return (v ?? null) as unknown as never;
    },
    set: async (key, val, opts) => {
      memStore.kv.set(key, val);
      if (opts?.ex) memStore.expires.set(key, Date.now() + opts.ex * 1000);
      return "OK";
    },
    sadd: async (key, member) => {
      let s = memStore.sets.get(key);
      if (!s) {
        s = new Set();
        memStore.sets.set(key, s);
      }
      const had = s.has(member);
      s.add(member);
      return had ? 0 : 1;
    },
    scard: async (key) => memStore.sets.get(key)?.size ?? 0,
    smembers: async (key) => Array.from(memStore.sets.get(key) ?? []),
    keys: async (pattern) => {
      // 简单支持 prefix*，清理过期
      const prefix = pattern.endsWith("*") ? pattern.slice(0, -1) : pattern;
      const result: string[] = [];
      for (const key of Array.from(memStore.kv.keys())) {
        if (isExpired(key)) continue;
        if (key.startsWith(prefix)) result.push(key);
      }
      return result;
    },
    del: async (key) => {
      const had = memStore.kv.delete(key) || memStore.sets.delete(key);
      memStore.expires.delete(key);
      return had ? 1 : 0;
    },
    expire: async (key, seconds) => {
      if (!memStore.kv.has(key) && !memStore.sets.has(key)) return 0;
      memStore.expires.set(key, Date.now() + seconds * 1000);
      return 1;
    },
    mget: async (...keys) => {
      const arr: unknown[] = [];
      for (const key of keys) {
        if (isExpired(key)) arr.push(null);
        else arr.push(memStore.kv.get(key) ?? null);
      }
      return arr as unknown as never;
    },
    setMax: async (key, value) => {
      const cur = Number(memStore.kv.get(key) ?? 0);
      if (value > cur) {
        memStore.kv.set(key, value);
        return value;
      }
      return cur;
    },
  };
  return cachedClient;
}

// ============================================================
// 4. 导出统一接口 + 便利函数
// ============================================================
export { getClient };

/** 当前是否在用真 KV（自己看后台时显示"内存降级"警告） */
export function usingRealKv(): boolean {
  return hasKvEnv();
}

/** 当日键前缀：YYYY-MM-DD（UTC+8 北京时间） */
export function dayKey(date: Date = new Date()): string {
  const beijing = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const y = beijing.getUTCFullYear();
  const m = String(beijing.getUTCMonth() + 1).padStart(2, "0");
  const d = String(beijing.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 当前是否处于活跃时段（主页是否显示"此刻 N 人在线"） */
export function recentDays(n: number): string[] {
  const result: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    result.push(dayKey(d));
  }
  return result;
}
