"use client";

/**
 * Rate-limit-aware infrastructure for `gen_call` reads on Bradbury's
 * public RPC.
 *
 * The public endpoint (https://rpc-bradbury.genlayer.com) silently
 * rate-limits gen_call per-IP. Symptom: errors with message
 * "rate limit exceeded for method: gen_call".
 *
 * This module provides:
 *   - withRateLimitRetry(): exponential backoff (5s, 10s, 20s, 40s)
 *     specifically for rate-limit responses; one-shot on other errors
 *   - cachedRead(): localStorage TTL cache (5 min default), used by SWR
 *     fallbackData so we render instantly from cache while revalidating
 *   - logErrorOnce(): de-duplicates console error logging per error
 *     class so the console doesn't spam
 *   - rateLimitToastBus: tiny pub/sub so the page can show a single
 *     toast when retries are exhausted, without prop-drilling
 */

const RATE_LIMIT_PHRASES = [
  "rate limit exceeded",
  "limitexceeded",
  "request exceeds defined limit",
];

function isRateLimitError(err: unknown): boolean {
  const msg = String((err as Error)?.message ?? err).toLowerCase();
  return RATE_LIMIT_PHRASES.some((p) => msg.includes(p));
}

/**
 * Run `fn`; on rate-limit errors retry with delays 5s, 10s, 20s, 40s.
 * On non-rate-limit errors throws immediately. After 4 failed retries
 * the final error is rethrown and the rate-limit toast bus is fired.
 */
export async function withRateLimitRetry<T>(fn: () => Promise<T>): Promise<T> {
  const delays = [5_000, 10_000, 20_000, 40_000];
  let lastErr: unknown;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRateLimitError(err)) throw err;
      if (attempt === delays.length) {
        emitRateLimitToast();
        throw err;
      }
      logErrorOnce("rate-limit", err);
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
  }
  throw lastErr;
}

// ---------------------------------------------------------------------------
// Console error de-dup
// ---------------------------------------------------------------------------
const _loggedErrorKeys = new Set<string>();

export function logErrorOnce(category: string, err: unknown): void {
  const msg = String((err as Error)?.message ?? err).slice(0, 160);
  const key = `${category}:${msg}`;
  if (_loggedErrorKeys.has(key)) return;
  _loggedErrorKeys.add(key);
  // Use console.warn so it isn't styled as a fatal red console.error
  // and so the user's existing console.error filter for rate limits
  // doesn't double-log it.
  console.warn(`[gitdrip] ${category}: ${msg}`);
}

// ---------------------------------------------------------------------------
// localStorage cache (5 min TTL)
// ---------------------------------------------------------------------------
const CACHE_KEY = "gitdrip:rpc-cache:v1";
const DEFAULT_TTL_MS = 5 * 60 * 1000;

type CacheEntry = { ts: number; value: unknown };
type CacheMap = Record<string, CacheEntry>;

function loadCache(): CacheMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CacheMap) : {};
  } catch {
    return {};
  }
}

function saveCache(map: CacheMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch {
    // localStorage full or disabled — silent fail, just a perf miss.
  }
}

/**
 * Read a cached value for `key`. Returns undefined when missing or stale.
 * Pass to SWR's `fallbackData` so the page renders instantly from cache.
 */
export function getCached<T>(
  key: string,
  ttlMs: number = DEFAULT_TTL_MS,
): T | undefined {
  const map = loadCache();
  const entry = map[key];
  if (!entry) return undefined;
  if (Date.now() - entry.ts > ttlMs) return undefined;
  return entry.value as T;
}

/** Same as getCached but also returns the original timestamp. */
export function getCachedWithTs<T>(
  key: string,
  ttlMs: number = DEFAULT_TTL_MS,
): { value: T; ts: number } | undefined {
  const map = loadCache();
  const entry = map[key];
  if (!entry) return undefined;
  if (Date.now() - entry.ts > ttlMs) return undefined;
  return { value: entry.value as T, ts: entry.ts };
}

export function setCached<T>(key: string, value: T): void {
  const map = loadCache();
  // bigints aren't JSON-serializable; convert before write.
  map[key] = { ts: Date.now(), value: serializeBigints(value) };
  // Evict entries older than 24h to bound size.
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const k of Object.keys(map)) {
    if (map[k].ts < cutoff) delete map[k];
  }
  saveCache(map);
}

/**
 * Recursively replace bigints with `{__bigint__: "<dec>"}` markers so the
 * tree round-trips through JSON.stringify. `parseBigints` is the inverse.
 */
function serializeBigints(input: unknown): unknown {
  if (typeof input === "bigint") return { __bigint__: input.toString() };
  if (Array.isArray(input)) return input.map(serializeBigints);
  if (input && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      out[k] = serializeBigints(v);
    }
    return out;
  }
  return input;
}

export function parseBigints(input: unknown): unknown {
  if (
    input &&
    typeof input === "object" &&
    !Array.isArray(input) &&
    "__bigint__" in (input as Record<string, unknown>)
  ) {
    try {
      return BigInt((input as { __bigint__: string }).__bigint__);
    } catch {
      return 0n;
    }
  }
  if (Array.isArray(input)) return input.map(parseBigints);
  if (input && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      out[k] = parseBigints(v);
    }
    return out;
  }
  return input;
}

// ---------------------------------------------------------------------------
// Rate-limit toast bus
// ---------------------------------------------------------------------------
type ToastListener = () => void;
const _toastListeners = new Set<ToastListener>();

export function subscribeRateLimitToast(fn: ToastListener): () => void {
  _toastListeners.add(fn);
  return () => _toastListeners.delete(fn);
}

function emitRateLimitToast(): void {
  for (const fn of _toastListeners) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
}
