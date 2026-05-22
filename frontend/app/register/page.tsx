"use client";
export const dynamic = "force-dynamic";
import { useWallet } from "@/hooks/use-wallet";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Copy,
  Loader2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TxLink } from "@/components/tx-link";
import { TxStatusPill } from "@/components/tx-status-pill";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { client, CONTRACT_ADDRESS } from "@/lib/genlayer";
import { humanError } from "@/lib/errors";
import { useTypewriter } from "@/hooks/use-typewriter";
import { useTxStatus } from "@/hooks/use-tx-status";

export default function RegisterPage() {
  const { ready, login, address: addr } = useWallet();
  const [repo, setRepo] = useState("");
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const walletLine = addr ? addr.toLowerCase() : "<connect wallet first>";
  const typedWallet = useTypewriter(walletLine, 600);
  const jsonTemplate = `{\n  "maintainer_wallet": "${walletLine}"\n}`;
  const txStatus = useTxStatus(txHash);

  const copyTemplate = () => {
    void navigator.clipboard.writeText(jsonTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const onRegister = async () => {
    setError(null);
    setTxHash(null);
    const slug = repo
      .trim()
      .replace(/^https?:\/\/github\.com\//, "")
      .replace(/\/$/, "");
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
      const hash =
        typeof tx === "string" ? tx : (tx?.hash ?? tx?.transactionHash);
      if (hash) setTxHash(hash);
    } catch (e: unknown) {
      setError(humanError(e instanceof Error ? e.message : String(e)));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {(submitting || (txStatus && (txStatus.stage === "pending" || txStatus.stage === "submitting"))) && (
        <div className="top-progress" aria-hidden />
      )}
      <SiteHeader />
      <main className="px-6 md:px-12 lg:px-20 py-16 md:py-24">
        <div className="max-w-5xl">
          {/* Tag + headline */}
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-(--accent-driprose) mb-4">
            maintainer
          </p>
          <h1
            className="text-5xl sm:text-6xl md:text-7xl text-(--ink-display) tracking-tight leading-[0.95]"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Commit This File.
            <br />
            <span className="text-(--ink-muted)">We Verify the Rest.</span>
          </h1>

          {/* Wallet status — single line, not a step */}
          <div className="mt-10 flex items-center gap-3 text-sm">
            <Wallet
              aria-hidden
              className={`w-4 h-4 ${addr ? "text-(--accent-driprose)" : "text-(--ink-faint)"}`}
            />
            {addr ? (
              <>
                <span className="text-(--ink-muted) font-mono">connected</span>
                <span className="font-mono text-(--ink-body)">{addr}</span>
              </>
            ) : (
              <>
                <span className="text-(--ink-muted)">no wallet connected</span>
                <Button
                  size="sm"
                  onClick={login}
                  disabled={!ready}
                  className="ml-2 h-7 px-3 text-xs bg-(--accent-driprose) hover:bg-(--accent-driprose-hover) text-(--accent-on-driprose)"
                >
                  connect
                </Button>
              </>
            )}
          </div>

          {/* JSON TEMPLATE — the centerpiece */}
          <div className="mt-12">
            <div className="overflow-hidden border border-(--rule-strong) bg-(--surface-sunken) rounded-md">
              {/* Filename header bar */}
              <div className="flex items-center justify-between border-b border-(--rule) px-5 py-3 bg-(--surface-card)">
                <span className="font-mono text-sm text-(--ink-body)">
                  .gitdrip.json
                </span>
                <button
                  type="button"
                  onClick={copyTemplate}
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-(--ink-muted) hover:text-(--accent-driprose) transition-colors px-2 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="copy template"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-(--status-good)" />
                      copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      copy
                    </>
                  )}
                </button>
              </div>
              {/* The actual code, big and breathable */}
              <pre className="px-6 py-8 md:px-10 md:py-10 font-mono text-lg md:text-2xl leading-[1.6] text-(--ink-display) overflow-x-auto tabular-nums">
                <code>
                  {`{\n  `}
                  <span className="text-(--accent-driprose)">
                    &quot;maintainer_wallet&quot;
                  </span>
                  {": "}
                  <span className="text-(--ink-body)">
                    &quot;{typedWallet}
                    {typedWallet.length < walletLine.length && (
                      <span className="inline-block w-[0.5ch] h-[1em] bg-(--accent-driprose) align-middle animate-pulse ml-0.5" />
                    )}
                    &quot;
                  </span>
                  {`\n}`}
                </code>
              </pre>
            </div>
            <p className="mt-4 text-sm text-(--ink-muted) max-w-[60ch]">
              push to the default branch root. the contract fetches{" "}
              <span className="font-mono text-(--ink-body)">
                raw.githubusercontent.com/&lt;owner&gt;/&lt;repo&gt;/HEAD/.gitdrip.json
              </span>{" "}
              during verification.
            </p>
          </div>

          {/* Submit form — secondary visual weight */}
          <div className="mt-16 border-t border-(--rule) pt-10">
            <h2
              className="text-2xl text-(--ink-display) mb-6"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Once It&apos;s Pushed, Register On-chain
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
              <div>
                <label
                  htmlFor="repo"
                  className="block font-mono text-xs uppercase tracking-[0.14em] text-(--ink-muted) mb-2"
                >
                  repo slug
                </label>
                <Input
                  id="repo"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  placeholder="owner/repo"
                  className="h-11 font-mono bg-(--surface-sunken) border-(--rule)"
                />
              </div>
              <div>
                <label
                  htmlFor="token"
                  className="block font-mono text-xs uppercase tracking-[0.14em] text-(--ink-muted) mb-2"
                >
                  github token (optional)
                </label>
                <Input
                  id="token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_..."
                  className="h-11 font-mono bg-(--surface-sunken) border-(--rule)"
                />
              </div>
            </div>

            <Button
              onClick={onRegister}
              disabled={submitting || !addr}
              className="mt-6 bg-(--accent-driprose) hover:bg-(--accent-driprose-hover) text-(--accent-on-driprose) h-12 px-7 text-base"
            >
              {submitting ? (
                <>
                  <Loader2 aria-hidden className="w-4 h-4 mr-2 animate-spin" />
                  Verifying On-chain...
                </>
              ) : (
                <>
                  Register Repo
                  <ArrowRight aria-hidden className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>

            {error && (
              <p
                role="alert"
                className="mt-4 inline-flex items-center gap-2 text-sm text-(--status-bad)"
              >
                <AlertTriangle aria-hidden className="w-4 h-4" />
                {error}
              </p>
            )}
            {txHash && (
              <div className="mt-6 border-t border-(--rule) pt-5 flex flex-col gap-3" aria-live="polite">
                <TxStatusPill status={txStatus} />
                <span className="text-sm text-(--ink-muted)">
                  tx · <TxLink hash={txHash} />
                </span>
              </div>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
