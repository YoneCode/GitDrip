"use client";

import useSWR, { type SWRConfiguration } from "swr";
import {
  getRepo,
  getRoster,
  getScoreLog,
  recentSponsoredRepos,
  type RepoRecord,
  type ScoreSnapshot,
} from "@/lib/contract";
import {
  getCached,
  getCachedWithTs,
  parseBigints,
  setCached,
  withRateLimitRetry,
} from "@/lib/rate-limit";

/**
 * Shared SWR config tuned for Bradbury's gen_call rate limit:
 *  - dedupingInterval 30s — coalesce duplicate requests within the window
 *  - refreshInterval 0   — manual revalidation only
 *  - revalidateOnFocus / OnReconnect off so tab/network changes don't spam
 *  - keepPreviousData on  — render last good data while a fresh fetch runs
 */
const SWR_OPTS: SWRConfiguration = {
  dedupingInterval: 30_000,
  refreshInterval: 0,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  keepPreviousData: true,
  errorRetryCount: 0, // we do our own backoff inside the fetcher
};

// ---------------------------------------------------------------------------
// /dashboard/[repo] — one SWR call, four reads in parallel inside.
// ---------------------------------------------------------------------------

export type RepoDashboardData = {
  record: RepoRecord | null;
  roster: Record<string, string>;
  latestSnap: ScoreSnapshot | null;
};

const REPO_DASHBOARD_PREFIX = "repo-dashboard:";

async function fetchRepoDashboard(slug: string): Promise<RepoDashboardData> {
  return withRateLimitRetry(async () => {
    const [record, roster] = await Promise.all([
      getRepo(slug),
      getRoster(slug),
    ]);
    let latestSnap: ScoreSnapshot | null = null;
    if (record && record.distribution_count > 0) {
      latestSnap = await getScoreLog(slug, record.distribution_count);
    }
    const out: RepoDashboardData = {
      record,
      roster: roster ?? {},
      latestSnap,
    };
    setCached(`${REPO_DASHBOARD_PREFIX}${slug}`, out);
    return out;
  });
}

export function useRepoDashboard(slug: string) {
  const cacheKey = `${REPO_DASHBOARD_PREFIX}${slug}`;
  const cached = getCachedWithTs<RepoDashboardData>(cacheKey);
  const swr = useSWR<RepoDashboardData>(
    slug ? ["repo-dashboard", slug] : null,
    () => fetchRepoDashboard(slug),
    {
      ...SWR_OPTS,
      fallbackData: cached
        ? (parseBigints(cached.value) as RepoDashboardData)
        : undefined,
    },
  );
  return {
    data: swr.data,
    error: swr.error,
    isLoading: !swr.data && !swr.error,
    isValidating: swr.isValidating,
    mutate: swr.mutate,
    cachedAt: cached?.ts,
  };
}

// ---------------------------------------------------------------------------
// /dashboard root — recently sponsored repos
// ---------------------------------------------------------------------------

export type RecentSponsoredItem = {
  slug: string;
  pool_wei: string;
  lastTs: number;
};

const RECENT_SPONSORED_KEY = "recent-sponsored";

async function fetchRecentSponsored(): Promise<RecentSponsoredItem[]> {
  return withRateLimitRetry(async () => {
    const items = await recentSponsoredRepos(24, 3);
    setCached(RECENT_SPONSORED_KEY, items);
    return items;
  });
}

export function useRecentSponsored() {
  const cached = getCachedWithTs<RecentSponsoredItem[]>(RECENT_SPONSORED_KEY);
  const swr = useSWR<RecentSponsoredItem[]>(
    ["recent-sponsored"],
    () => fetchRecentSponsored(),
    {
      ...SWR_OPTS,
      fallbackData: cached
        ? (parseBigints(cached.value) as RecentSponsoredItem[])
        : undefined,
    },
  );
  return {
    data: swr.data,
    error: swr.error,
    isLoading: !swr.data && !swr.error,
    mutate: swr.mutate,
    cachedAt: cached?.ts,
  };
}

// ---------------------------------------------------------------------------
// "next_deposit" — small read used as a heartbeat on /dashboard root.
// Manual refresh only; no auto-poll.
// ---------------------------------------------------------------------------

import { nextDepositId } from "@/lib/contract";

const NEXT_DEPOSIT_KEY = "next-deposit";

async function fetchNextDeposit(): Promise<bigint> {
  return withRateLimitRetry(async () => {
    const v = await nextDepositId();
    setCached(NEXT_DEPOSIT_KEY, v);
    return v;
  });
}

export function useNextDeposit() {
  const cached = getCached<unknown>(NEXT_DEPOSIT_KEY);
  const fallback =
    cached !== undefined ? (parseBigints(cached) as bigint) : undefined;
  const swr = useSWR<bigint>(["next-deposit"], () => fetchNextDeposit(), {
    ...SWR_OPTS,
    fallbackData: fallback,
  });
  return {
    data: swr.data,
    error: swr.error,
    mutate: swr.mutate,
    cachedAt: getCachedWithTs<unknown>(NEXT_DEPOSIT_KEY)?.ts,
  };
}
