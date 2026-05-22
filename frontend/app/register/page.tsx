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
import { humanError } from "@/lib/errors";

export default function RegisterPage() {
  const { ready, login, address: addr } = useWallet();
  const [repo, setRepo] = useState("");
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const jsonTemplate = addr
    ? JSON.stringify({ maintainer_wallet: addr.toLowerCase() }, null, 2)
    : '{\n  "maintainer_wallet": "<connect wallet first>"\n}';

  const copyTemplate = () => {
    void navigator.clipboard.writeText(jsonTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const onRegister = async () => {
    setError(null);
    setTxHash(null);
    const slug = repo.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "");
    if (!slug || !slug.includes("/")) {
      setError("enter owner/repo (e.g. alice/cool-cli)");
      return;
    }
    try {
      setSubmitting(true);
      const tx = await client().writeContract({
        address: CONTRACT_ADDRESS,
        functionName: "register_repo",
        args: [slug, token.trim()],
        value: 0n,
      });
      const hash = typeof tx === "string" ? tx : (tx?.hash ?? tx?.transactionHash);
      if (hash) setTxHash(hash);
    } catch (e: unknown) {
      setError(humanError(e instanceof Error ? e.message : String(e)));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="px-6 md:px-12 lg:px-20 py-20"><div className="max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-(--accent-driprose) mb-4">
          maintainer
        </p>
        <h1 className="font-display text-5xl md:text-6xl text-(--ink-display) tracking-tight leading-[0.95]">
          register your repo
        </h1>
        <p className="mt-6 text-lg text-(--ink-muted) max-w-[50ch]">
          Three steps: connect wallet, commit a proof file to your repo,
          then click verify. The contract fetches the file and checks that
          the wallet matches.
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

        {/* Step 2: commit .gitdrip.json */}
        <section className="mt-10">
          <h2 className="font-display text-xl text-(--ink-display) mb-3">
            2. commit{" "}
            <code className="font-mono text-base">.gitdrip.json</code> to
            your repo root
          </h2>
          <div className="relative">
            <pre className="bg-(--surface-sunken) border border-(--rule) rounded-md p-4 font-mono text-sm text-(--ink-body) overflow-x-auto">
              {jsonTemplate}
            </pre>
            <button
              type="button"
              onClick={copyTemplate}
              className="absolute top-3 right-3 p-1.5 rounded hover:bg-(--surface-card) focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="copy template"
            >
              {copied ? (
                <Check className="w-4 h-4 text-(--status-good)" />
              ) : (
                <Copy className="w-4 h-4 text-(--ink-faint)" />
              )}
            </button>
          </div>
          <p className="mt-2 text-sm text-(--ink-muted)">
            Push to the default branch. The contract fetches
            raw.githubusercontent.com/owner/repo/HEAD/.gitdrip.json.
          </p>
        </section>

        {/* Step 3: call register_repo */}
        <section className="mt-10">
          <h2 className="font-display text-xl text-(--ink-display) mb-3">
            3. verify and register
          </h2>
          <div className="space-y-3 max-w-md">
            <div>
              <label
                htmlFor="repo"
                className="block font-mono text-xs uppercase tracking-[0.14em] text-(--ink-muted) mb-1"
              >
                repo slug
              </label>
              <Input
                id="repo"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="owner/repo"
                className="font-mono"
              />
            </div>
            <div>
              <label
                htmlFor="token"
                className="block font-mono text-xs uppercase tracking-[0.14em] text-(--ink-muted) mb-1"
              >
                github token (optional, raises api limit)
              </label>
              <Input
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_..."
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
            onClick={onRegister}
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
                register
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
