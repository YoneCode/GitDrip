"use client";
export const dynamic = "force-dynamic";
import { useWallet } from "@/hooks/use-wallet";

import { useState } from "react";
import { AlertTriangle, ArrowRight, Check, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TxLink } from "@/components/tx-link";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { client, CONTRACT_ADDRESS } from "@/lib/genlayer";

export default function EnrollPage() {
  const { ready, login, address: addr } = useWallet();
  const [repo, setRepo] = useState("");
  const [ghLogin, setGhLogin] = useState("");
  const [gistId, setGistId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const slug = repo.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "");
  const gistBody = addr && slug
    ? `gitdrip:${slug}:${addr.toLowerCase()}`
    : "gitdrip:<owner/repo>:<your-wallet>";

  const copyGist = () => {
    void navigator.clipboard.writeText(gistBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const onEnroll = async () => {
    setError(null);
    setTxHash(null);
    if (!slug || !slug.includes("/")) {
      setError("enter owner/repo");
      return;
    }
    if (!ghLogin.trim()) {
      setError("enter your github login");
      return;
    }
    if (!gistId.trim()) {
      setError("enter the gist id");
      return;
    }
    try {
      setSubmitting(true);
      const tx = await client().writeContract({
        address: CONTRACT_ADDRESS,
        functionName: "enroll_contributor",
        args: [slug, ghLogin.trim().toLowerCase(), gistId.trim()],
        value: 0n,
      });
      const hash = typeof tx === "string" ? tx : (tx?.hash ?? tx?.transactionHash);
      if (hash) setTxHash(hash);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="px-6 md:px-12 lg:px-20 py-20"><div className="max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-(--accent-driprose) mb-4">
          contributor
        </p>
        <h1 className="font-display text-5xl md:text-6xl text-(--ink-display) tracking-tight leading-[0.95]">
          enroll in a repo
        </h1>
        <p className="mt-6 text-lg text-(--ink-muted) max-w-[50ch]">
          Prove you own a GitHub login by publishing a public gist with a
          specific body, then paste the gist id here. The contract fetches
          the gist and verifies ownership.
        </p>

        {/* Step 1: connect */}
        <section className="mt-12">
          <h2 className="font-display text-xl text-(--ink-display) mb-3">
            1. connect wallet
          </h2>
          {addr ? (
            <p className="font-mono text-sm text-(--ink-body)">{addr}</p>
          ) : (
            <Button
              onClick={login}
              disabled={!ready}
              className="bg-(--accent-driprose) hover:bg-(--accent-driprose-hover) text-(--accent-on-driprose)"
            >
              connect
            </Button>
          )}
        </section>

        {/* Step 2: create gist */}
        <section className="mt-10">
          <h2 className="font-display text-xl text-(--ink-display) mb-3">
            2. publish a public gist with this exact content
          </h2>
          <p className="text-sm text-(--ink-muted) mb-2">
            Enter the repo slug first so the template fills in:
          </p>
          <Input
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="owner/repo"
            className="max-w-sm font-mono mb-4"
            aria-label="repo slug for gist"
          />
          <div className="relative">
            <pre className="bg-(--surface-sunken) border border-(--rule) rounded-md p-4 font-mono text-sm text-(--ink-body) overflow-x-auto">
              {gistBody}
            </pre>
            <button
              type="button"
              onClick={copyGist}
              className="absolute top-3 right-3 p-1.5 rounded hover:bg-(--surface-card) focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="copy gist body"
            >
              {copied ? (
                <Check className="w-4 h-4 text-(--status-good)" />
              ) : (
                <Copy className="w-4 h-4 text-(--ink-faint)" />
              )}
            </button>
          </div>
          <p className="mt-2 text-sm text-(--ink-muted)">
            Create a{" "}
            <a
              href="https://gist.github.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-(--accent-driprose) hover:text-(--accent-driprose-hover) underline underline-offset-2"
            >
              new public gist
            </a>{" "}
            with a single file containing that line. Copy the gist id from
            the URL (the hex part after gist.github.com/yourlogin/).
          </p>
        </section>

        {/* Step 3: submit */}
        <section className="mt-10">
          <h2 className="font-display text-xl text-(--ink-display) mb-3">
            3. verify and enroll
          </h2>
          <div className="space-y-3 max-w-md">
            <div>
              <label
                htmlFor="login"
                className="block font-mono text-xs uppercase tracking-[0.14em] text-(--ink-muted) mb-1"
              >
                github login
              </label>
              <Input
                id="login"
                value={ghLogin}
                onChange={(e) => setGhLogin(e.target.value)}
                placeholder="your-github-username"
                className="font-mono"
              />
            </div>
            <div>
              <label
                htmlFor="gist"
                className="block font-mono text-xs uppercase tracking-[0.14em] text-(--ink-muted) mb-1"
              >
                gist id
              </label>
              <Input
                id="gist"
                value={gistId}
                onChange={(e) => setGistId(e.target.value)}
                placeholder="abc123def456..."
                className="font-mono"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-3 inline-flex items-center gap-2 text-sm text-(--status-bad)">
              <AlertTriangle aria-hidden className="w-4 h-4" />
              {error}
            </p>
          )}
          {txHash && (
            <p className="mt-3 text-sm text-(--ink-body)" aria-live="polite">
              submitted · <TxLink hash={txHash} />
            </p>
          )}

          <Button
            onClick={onEnroll}
            disabled={submitting || !addr}
            className="mt-4 bg-(--accent-driprose) hover:bg-(--accent-driprose-hover) text-(--accent-on-driprose) h-11 px-6"
          >
            {submitting ? (
              <>
                <Loader2 aria-hidden className="w-4 h-4 mr-2 animate-spin" />
                verifying
              </>
            ) : (
              <>
                enroll
                <ArrowRight aria-hidden className="w-4 h-4 ml-1.5" />
              </>
            )}
          </Button>
        </section>
      </div></main>
      <SiteFooter />
    </>
  );
}
