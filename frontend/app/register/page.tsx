"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, Check, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TxLink } from "@/components/tx-link";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { client, connectWallet, CONTRACT_ADDRESS } from "@/lib/genlayer";

export default function RegisterPage() {
  const [addr, setAddr] = useState<`0x${string}` | null>(null);
  const [repo, setRepo] = useState("");
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const eth = window.ethereum;
    if (!eth) return;
    eth
      .request({ method: "eth_accounts" })
      .then((accounts) => {
        const list = accounts as string[];
        if (list[0]) setAddr(list[0] as `0x${string}`);
      })
      .catch(() => {});
  }, []);

  const onConnect = async () => {
    const a = await connectWallet();
    if (a) setAddr(a);
  };

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
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-20">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-(--ink-faint) mb-3">
          maintainer
        </p>
        <h1 className="font-display text-4xl text-(--ink-display) tracking-tight">
          register your repo
        </h1>
        <p className="mt-3 text-(--ink-muted) max-w-[60ch]">
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
              onClick={onConnect}
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
      </main>
      <SiteFooter />
    </>
  );
}
