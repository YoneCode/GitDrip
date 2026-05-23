"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Search, Loader2 } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { TextSkeleton } from "@/components/skeleton";
import { FreshnessPill } from "@/components/freshness-pill";
import { RateLimitToast } from "@/components/rate-limit-toast";
import { useViewTransition } from "@/hooks/use-view-transition";
import { useWallet } from "@/hooks/use-wallet";
import { useNextDeposit, useRecentSponsored } from "@/hooks/use-repo-data";
import { formatGen } from "@/lib/format";
import { getRepoActivity, type ProfileEntry } from "@/lib/profile";

const EXAMPLES = [
  { slug: "genlayerlabs/genvm", desc: "GenLayer's intelligent contract VM" },
  { slug: "genlayerlabs/genlayer-py", desc: "Python SDK for genvm contracts" },
];

type GhRepo = { full_name: string; description: string | null; stargazers_count: number };

export default function DashboardIndex() {
  const navigate = useViewTransition();
  const { address: addr } = useWallet();
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<GhRepo[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const {
    data: lastDepositId,
    mutate: refreshNextDeposit,
    cachedAt: depositCachedAt,
  } = useNextDeposit();
  const prevDepositRef = useRef<bigint | null>(null);
  const [tick, setTick] = useState(false);
  const [activity, setActivity] = useState<ProfileEntry[]>([]);

  // Read profile entries on wallet change
  useEffect(() => {
    setActivity(getRepoActivity(addr));
  }, [addr]);

  // Live "recently sponsored" rail — SWR-backed, no auto-poll
  const {
    data: recent,
    isLoading: recentLoading,
    mutate: refreshRecent,
  } = useRecentSponsored();

  const refreshAll = () => {
    void refreshNextDeposit();
    void refreshRecent();
  };

  // Show a brief "+1 deposit" pulse when next_deposit_id ticks up
  useEffect(() => {
    if (lastDepositId === undefined || lastDepositId === null) return;
    if (
      prevDepositRef.current !== null &&
      lastDepositId > prevDepositRef.current
    ) {
      setTick(true);
      const t = window.setTimeout(() => setTick(false), 2400);
      return () => window.clearTimeout(t);
    }
    prevDepositRef.current = lastDepositId;
  }, [lastDepositId]);

  // Live GitHub repo search (debounced)
  useEffect(() => {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    const trimmed = q.trim();
    if (trimmed.length < 3 || trimmed.includes(" ")) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const r = await fetch(
          `https://api.github.com/search/repositories?q=${encodeURIComponent(trimmed)}+in:name&per_page=5&sort=stars`,
        );
        if (!r.ok) { setSuggestions([]); return; }
        const data = await r.json();
        setSuggestions((data.items as GhRepo[]) ?? []);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 280);
    return () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    };
  }, [q]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = q.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "");
    if (slug) navigate(`/dashboard/${slug}`);
  };

  return (
    <>
      {searching && <div className="top-progress" aria-hidden />}
      <SiteHeader />
      <RateLimitToast />
      <main className="px-6 md:px-12 lg:px-20 py-16 md:py-24">
        <div className="max-w-5xl">
          <div className="flex items-center justify-between mb-4">
  <h1 className="sr-only">Dashboard — look up an on-chain repo</h1>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-(--accent-driprose)">
              dashboard
            </p>
            {lastDepositId !== null && lastDepositId !== undefined && (
              <div className="flex flex-col items-end gap-1">
                <p
                  className={`font-mono text-xs text-(--ink-muted) transition-opacity duration-500 ${tick ? "text-(--accent-driprose)" : ""}`}
                  aria-live="polite"
                >
                  {lastDepositId.toString()}{" "}
                  {lastDepositId === 1n ? "deposit" : "deposits"} on-chain
                  {tick && (
                    <span className="ml-2 text-(--accent-driprose)">↑ new</span>
                  )}
                </p>
                <FreshnessPill
                  cachedAt={depositCachedAt}
                  onRefresh={refreshAll}
                />
              </div>
            )}
          </div>

          <form onSubmit={submit} className="block animate-fade-rise">
            <label htmlFor="repo-search" className="sr-only">repository slug</label>
            <div className="relative border-b-2 border-(--rule-strong) focus-within:border-(--accent-driprose) transition-colors">
              <Search aria-hidden className="absolute left-0 top-1/2 -translate-y-1/2 w-7 h-7 md:w-9 md:h-9 text-(--ink-faint)" />
              <input
                id="repo-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="owner/repo"
                className="w-full pl-12 md:pl-16 pr-32 md:pr-44 py-4 md:py-6 bg-transparent text-3xl md:text-5xl lg:text-6xl text-(--ink-display) font-mono placeholder:text-(--ink-faint) focus:outline-none"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="submit"
                disabled={!q.trim()}
                className="absolute right-0 top-1/2 -translate-y-1/2 inline-flex items-center gap-2 px-5 md:px-7 py-3 md:py-4 bg-(--accent-driprose) hover:bg-(--accent-driprose-hover) disabled:opacity-30 disabled:cursor-not-allowed text-(--accent-on-driprose) font-medium text-sm md:text-base transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                aria-label="open dashboard"
              >
                Open
                <ArrowRight aria-hidden className="w-4 h-4" />
              </button>
            </div>
          </form>

          <YourReposRail activity={activity} hasWallet={!!addr} navigate={navigate} />

          {/* Live GitHub suggestions */}
          {suggestions.length > 0 && (
            <ul
              className="mt-6 border border-(--rule) rounded-md divide-y divide-(--rule) overflow-hidden"
              role="listbox"
              aria-label="repository suggestions"
            >
              {suggestions.map((s) => (
                <li key={s.full_name}>
                  <button
                    type="button"
                    onClick={() => navigate(`/dashboard/${s.full_name}`)}
                    className="w-full text-left px-5 py-3 hover:bg-(--surface-card) transition-colors flex items-baseline justify-between gap-4 focus:outline-none focus-visible:bg-(--surface-card)"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-sm text-(--ink-body) truncate">{s.full_name}</p>
                      {s.description && (
                        <p className="text-xs text-(--ink-muted) mt-1 truncate">{s.description}</p>
                      )}
                    </div>
                    <span className="font-mono text-xs text-(--ink-faint) tabular-nums shrink-0">
                      ★ {s.stargazers_count.toLocaleString()}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {q.trim().length >= 3 && !searching && suggestions.length === 0 && !q.includes("/") && (
            <p className="mt-4 text-sm text-(--ink-faint)">
              No matching repos on GitHub. Type a full <span className="font-mono">owner/repo</span> slug to open it.
            </p>
          )}
          {searching && (
            <p className="mt-4 inline-flex items-center gap-2 text-sm text-(--ink-muted)">
              <Loader2 aria-hidden className="w-3.5 h-3.5 animate-spin" />
              Searching GitHub…
            </p>
          )}

          <p className="mt-8 text-(--ink-muted) max-w-[55ch]">
            Pool size, scoring history, per-contributor splits. Real on-chain data, no sign-in needed.
          </p>

          <section className="mt-16">
            <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-(--ink-faint) mb-6">
              {recent && recent.length > 0
                ? "Recently Sponsored On-chain"
                : "Try One Of These"}
            </h2>
            {recent === undefined && recentLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="border border-(--rule) p-5 rounded-md"
                  >
                    <TextSkeleton lines={2} />
                  </div>
                ))}
              </div>
            ) : recent && recent.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recent.map((r) => (
                  <button
                    key={r.slug}
                    onClick={() => navigate(`/dashboard/${r.slug}`)}
                    className="group block text-left border border-(--rule) hover:border-(--accent-driprose) hover:-translate-y-0.5 transition-all duration-200 p-5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <p className="font-mono text-sm text-(--ink-body) group-hover:text-(--accent-driprose) transition-colors break-all">
                      {r.slug}
                    </p>
                    <p className="text-xs text-(--ink-muted) mt-2 leading-relaxed tabular-nums">
                      pool {formatGen(BigInt(r.pool_wei), 2)} GEN
                    </p>
                    <span className="inline-flex items-center gap-1 mt-4 text-xs font-mono text-(--ink-faint) group-hover:text-(--accent-driprose) transition-colors">
                      Open
                      <ArrowRight aria-hidden className="w-3 h-3" />
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex.slug}
                    onClick={() => navigate(`/dashboard/${ex.slug}`)}
                    className="group block text-left border border-(--rule) hover:border-(--accent-driprose) hover:-translate-y-0.5 transition-all duration-200 p-5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <p className="font-mono text-sm text-(--ink-body) group-hover:text-(--accent-driprose) transition-colors break-all">
                      {ex.slug}
                    </p>
                    <p className="text-xs text-(--ink-muted) mt-2 leading-relaxed">
                      {ex.desc}
                    </p>
                    <span className="inline-flex items-center gap-1 mt-4 text-xs font-mono text-(--ink-faint) group-hover:text-(--accent-driprose) transition-colors">
                      Open
                      <ArrowRight aria-hidden className="w-3 h-3" />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}


// ---------------------------------------------------------------------------
// YourReposRail — render repos this wallet has registered or enrolled in,
// grouped by role. Skipped when there is no activity yet.
// ---------------------------------------------------------------------------
function YourReposRail({
  activity,
  hasWallet,
  navigate,
}: {
  activity: ProfileEntry[];
  hasWallet: boolean;
  navigate: (href: string) => void;
}) {
  if (!hasWallet || activity.length === 0) return null;

  const maintainer = activity.filter((a) => a.role === "maintainer");
  const contributor = activity.filter((a) => a.role === "contributor");

  return (
    <section className="mt-10 border border-(--rule) rounded-md p-5 bg-(--surface-card)">
      <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-(--accent-driprose) mb-4">
        Your Repos
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        {maintainer.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wider text-(--ink-faint) mb-2 font-mono">
              maintainer
            </p>
            <ul className="space-y-1.5">
              {maintainer.map((e) => (
                <li key={`m-${e.slug}`}>
                  <button
                    type="button"
                    onClick={() => navigate(`/dashboard/${e.slug}`)}
                    className="font-mono text-sm text-(--ink-body) hover:text-(--accent-driprose) underline-offset-4 hover:underline truncate w-full text-left focus:outline-none focus-visible:text-(--accent-driprose)"
                  >
                    {e.slug}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {contributor.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wider text-(--ink-faint) mb-2 font-mono">
              contributor
            </p>
            <ul className="space-y-1.5">
              {contributor.map((e) => (
                <li key={`c-${e.slug}`}>
                  <button
                    type="button"
                    onClick={() => navigate(`/dashboard/${e.slug}`)}
                    className="font-mono text-sm text-(--ink-body) hover:text-(--accent-driprose) underline-offset-4 hover:underline truncate w-full text-left focus:outline-none focus-visible:text-(--accent-driprose)"
                  >
                    {e.slug}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
