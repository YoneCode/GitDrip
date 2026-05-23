"use client";

import { CONTRACT_ADDRESS, client } from "./genlayer";
import { withRateLimitRetry } from "./rate-limit";

/** JSON-decoded shape of a repo record stored on-chain. */
export type RepoRecord = {
  maintainer: string;
  github_token_hint: string;
  pool_wei: string;
  period_start_unix: number;
  last_distribution_unix: number;
  total_distributed_wei: string;
  distribution_count: number;
  last_release_tag: string;
};

export type ScoreSnapshot = {
  ts: number;
  since: string;
  until: string;
  scores: Record<string, number>;
  distributed_wei: string;
  release_tag: string;
};

export type Deposit = {
  repo: string;
  sponsor: string;
  amount: string;
  ts: number;
  refunded: boolean;
};

function parseJson<T>(raw: unknown): T | null {
  if (typeof raw !== "string" || raw.length === 0) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * All on-chain reads route through `withRateLimitRetry` from
 * lib/rate-limit.ts. That helper detects "rate limit exceeded" errors
 * specifically and retries with exponential backoff (5s, 10s, 20s, 40s).
 * Non-rate-limit errors are rethrown immediately.
 */
const withReadRetry = withRateLimitRetry;

export async function getRepo(repoSlug: string): Promise<RepoRecord | null> {
  const raw = await withReadRetry(() =>
    client().readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_repo",
      args: [repoSlug],
    }),
  );
  return parseJson<RepoRecord>(raw);
}

export async function getRoster(
  repoSlug: string,
): Promise<Record<string, string>> {
  const raw = await withReadRetry(() =>
    client().readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_roster",
      args: [repoSlug],
    }),
  );
  return parseJson<Record<string, string>>(raw) ?? {};
}

export async function getPending(wallet: string): Promise<bigint> {
  const raw = await withReadRetry(() =>
    client().readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_pending",
      args: [wallet.toLowerCase()],
    }),
  );
  if (typeof raw !== "string" || raw === "") return 0n;
  try {
    return BigInt(raw);
  } catch {
    return 0n;
  }
}

export async function getScoreLog(
  repoSlug: string,
  index: number,
): Promise<ScoreSnapshot | null> {
  const raw = await withReadRetry(() =>
    client().readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_score_log",
      args: [repoSlug, index],
    }),
  );
  return parseJson<ScoreSnapshot>(raw);
}

export async function getDeposit(id: bigint): Promise<Deposit | null> {
  const raw = await withReadRetry(() =>
    client().readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_deposit",
      args: [id],
    }),
  );
  return parseJson<Deposit>(raw);
}

export async function nextDepositId(): Promise<bigint> {
  const raw = await withReadRetry(() =>
    client().readContract({
      address: CONTRACT_ADDRESS,
      functionName: "next_deposit",
      args: [],
    }),
  );
  if (typeof raw === "bigint") return raw;
  if (typeof raw === "number") return BigInt(raw);
  if (typeof raw === "string") {
    try { return BigInt(raw); } catch { return 0n; }
  }
  return 0n;
}

/**
 * Walk the last `lookback` deposits (default 24) and return the most
 * recently sponsored repos with their on-chain pool. Sequential reads to
 * respect Bradbury's gen_call rate limit. Useful for the dashboard root
 * "recently sponsored" rail.
 */
export async function recentSponsoredRepos(
  lookback = 24,
  take = 3,
): Promise<Array<{ slug: string; pool_wei: string; lastTs: number }>> {
  const next = await nextDepositId();
  if (next === 0n) return [];
  const start = next - 1n;
  const end = next - BigInt(lookback) > 0n ? next - BigInt(lookback) : 0n;
  const seen = new Map<string, number>(); // slug -> latest ts
  for (let i = start; i >= end; i--) {
    const dep = await getDeposit(i);
    if (!dep) {
      if (i === 0n) break;
      continue;
    }
    const cur = seen.get(dep.repo) ?? 0;
    if (dep.ts > cur) seen.set(dep.repo, dep.ts);
    if (seen.size >= take * 2) break; // give us extras to handle dedup
    if (i === 0n) break;
  }
  // Sort by lastTs desc, take top N, then resolve pool sizes
  const sorted = [...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, take);
  const out: Array<{ slug: string; pool_wei: string; lastTs: number }> = [];
  for (const [slug, ts] of sorted) {
    const rec = await getRepo(slug);
    if (rec) out.push({ slug, pool_wei: rec.pool_wei, lastTs: ts });
  }
  return out;
}

// ---- writes -------------------------------------------------------------

export async function sponsor(repoSlug: string, valueWei: bigint) {
  return client().writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "sponsor",
    args: [repoSlug],
    value: valueWei,
  });
}

export async function claim() {
  return client().writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "claim",
    args: [],
    value: 0n,
  });
}

export async function sponsorRefund(depositId: bigint) {
  return client().writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "sponsor_refund",
    args: [depositId],
    value: 0n,
  });
}
