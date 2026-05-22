"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Search, Loader2 } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { useViewTransition } from "@/hooks/use-view-transition";
import { usePoll } from "@/hooks/use-poll";
import { nextDepositId } from "@/lib/contract";

const EXAMPLES = [
  { slug: "genlayerlabs/genvm", desc: "GenLayer's intelligent contract VM" },
  { slug: "genlayerlabs/skills", desc: "Claude skills for GenLayer dev" },
  { slug: "genlayerlabs/genlayer-py", desc: "Python SDK for genvm contracts" },
];

type GhRepo = { full_name: string; description: string | null; stargazers_count: number };

export default function DashboardIndex() {
  const navigate = useViewTransition();
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<GhRepo[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const lastDepositId = usePoll(() => nextDepositId(), 8000);
  const prevDepositRef = useRef<bigint | null>(null);
  const [tick, setTick] = useState(false);

  // Show a brief "+1 deposit" pulse when next_deposit_id ticks up
  useEffect(() => {
    if (lastDepositId === null) return;
    if (prevDepositRef.current !== null && lastDepositId > prevDepositRef.current) {
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
      <main className="px-6 md:px-12 lg:px-20 py-16 md:py-24">
        <div className="max-w-5xl">
          <div className="flex items-center justify-between mb-4">
  <h1 className="sr-only">Dashboard — look up an on-chain repo</h1>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-(--accent-driprose)">
              dashboard
            </p>
            {lastDepositId !== null && (
              <p
                className={`font-mono text-xs text-(--ink-muted) transition-opacity duration-500 ${tick ? "text-(--accent-driprose)" : ""}`}
                aria-live="polite"
              >
                {lastDepositId.toString()} {lastDepositId === 1n ? "deposit" : "deposits"} on-chain
                {tick && <span className="ml-2 text-(--accent-driprose)">↑ new</span>}
              </p>
            )}
          </div>

          <form onSubmit={submit} className="block">
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
              searching github…
            </p>
          )}

          <p className="mt-8 text-(--ink-muted) max-w-[55ch]">
            Pool size, scoring history, per-contributor splits. Real on-chain data, no sign-in needed.
          </p>

          <section className="mt-16">
            <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-(--ink-faint) mb-6">
              Try One Of These
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.slug}
                  onClick={() => navigate(`/dashboard/${ex.slug}`)}
                  className="group block text-left border border-(--rule) hover:border-(--accent-driprose) transition-colors p-5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <p className="font-mono text-sm text-(--ink-body) group-hover:text-(--accent-driprose) transition-colors break-all">
                    {ex.slug}
                  </p>
                  <p className="text-xs text-(--ink-muted) mt-2 leading-relaxed">{ex.desc}</p>
                  <span className="inline-flex items-center gap-1 mt-4 text-xs font-mono text-(--ink-faint) group-hover:text-(--accent-driprose) transition-colors">
                    Open
                    <ArrowRight aria-hidden className="w-3 h-3" />
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
