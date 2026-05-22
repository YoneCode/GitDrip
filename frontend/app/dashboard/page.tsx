"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

const EXAMPLES = [
  { slug: "genlayerlabs/genvm", desc: "GenLayer's intelligent contract VM" },
  { slug: "genlayerlabs/skills", desc: "Claude skills for GenLayer dev" },
  { slug: "genlayerlabs/genlayer-py", desc: "Python SDK for genvm contracts" },
];

export default function DashboardIndex() {
  const router = useRouter();
  const [q, setQ] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = q
      .trim()
      .replace(/^https?:\/\/github\.com\//, "")
      .replace(/\/$/, "");
    if (slug) router.push(`/dashboard/${slug}`);
  };

  return (
    <>
      <SiteHeader />
      <main className="px-6 md:px-12 lg:px-20 py-16 md:py-24">
        <div className="max-w-5xl">
          {/* Search input is the hero */}
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-(--accent-driprose) mb-4">
            dashboard
          </p>

          <form onSubmit={submit} className="block">
            <label htmlFor="repo-search" className="sr-only">
              repository slug
            </label>
            <div className="relative border-b-2 border-(--rule-strong) focus-within:border-(--accent-driprose) transition-colors">
              <Search
                aria-hidden
                className="absolute left-0 top-1/2 -translate-y-1/2 w-7 h-7 md:w-9 md:h-9 text-(--ink-faint)"
              />
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

          <p className="mt-6 text-(--ink-muted) max-w-[55ch]">
            Pool size, scoring history, per-contributor splits. Real on-chain data, no sign-in needed.
          </p>

          {/* Examples — proper tile cards, not bullet list */}
          <section className="mt-16">
            <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-(--ink-faint) mb-6">
              Try One Of These
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {EXAMPLES.map((ex) => (
                <Link
                  key={ex.slug}
                  href={`/dashboard/${ex.slug}`}
                  className="group block border border-(--rule) hover:border-(--accent-driprose) transition-colors p-5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
