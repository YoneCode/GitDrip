"use client";

import { CONTRACT_ADDRESS, client } from "./genlayer";

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
 * Bradbury rate-limits `gen_call` aggressively when many reads fire in
 * parallel. Retry up to 4 times with exponential backoff (250ms, 500ms,
 * 1s, 2s) when the error message indicates rate limiting.
 */
async function withReadRetry<T>(fn: () => Promise<T>): Promise<T> {
  const delays = [250, 500, 1000, 2000];
  let lastErr: unknown;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = String((err as Error)?.message ?? err).toLowerCase();
      const isRateLimit =
        msg.includes("rate limit") ||
        msg.includes("limitexceeded") ||
        msg.includes("request exceeds defined limit");
      if (!isRateLimit || attempt === delays.length) throw err;
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
  }
  throw lastErr;
}

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
