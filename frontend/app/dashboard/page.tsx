"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export default function DashboardIndex() {
  const router = useRouter();
  const [q, setQ] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = q.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "");
    if (slug) router.push(`/dashboard/${slug}`);
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[680px] px-6 py-20">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-(--ink-faint) mb-3 text-center">
          dashboard
        </p>
        <h1 className="font-display text-4xl text-(--ink-display) tracking-tight text-center">
          look up a repo
        </h1>
        <p className="mt-3 text-(--ink-muted) max-w-[60ch] mx-auto text-center">
          Pool size, scoring history, and per-contributor splits. Real on-chain
          data, no sign-in needed.
        </p>

        <form onSubmit={submit} className="mt-10 flex gap-3">
          <div className="relative flex-1">
            <Search
              aria-hidden
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-(--ink-faint)"
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="owner/repo"
              className="h-12 pl-9 font-mono"
              aria-label="repository slug"
            />
          </div>
          <Button
            type="submit"
            disabled={!q.trim()}
            className="bg-(--accent-driprose) hover:bg-(--accent-driprose-hover) text-(--accent-on-driprose) h-12 px-5"
          >
            open
            <ArrowRight aria-hidden className="w-4 h-4 ml-1.5" />
          </Button>
        </form>

        <hr className="my-12" />

        <h2 className="font-display text-xl text-(--ink-display) mb-4">
          examples to try
        </h2>
        <ul className="space-y-2 font-mono text-sm">
          <li>
            <Link
              className="text-(--accent-driprose) hover:text-(--accent-driprose-hover) underline underline-offset-2"
              href="/dashboard/genlayerlabs/genvm"
            >
              genlayerlabs/genvm
            </Link>
          </li>
          <li>
            <Link
              className="text-(--accent-driprose) hover:text-(--accent-driprose-hover) underline underline-offset-2"
              href="/dashboard/genlayerlabs/skills"
            >
              genlayerlabs/skills
            </Link>
          </li>
        </ul>
      </main>
      <SiteFooter />
    </>
  );
}
