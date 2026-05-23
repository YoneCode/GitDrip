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
import { useRegisterPreflight } from "@/hooks/use-register-preflight";
import { CheckRow, type CheckStatus } from "@/components/check-row";
import { recordRepoActivity } from "@/lib/profile";

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
  const preflight = useRegisterPreflight(repo, addr ? addr.toLowerCase() : null);

  const blockSubmit = (() => {
    if (!preflight.slug) return false; // no slug yet — nothing to block
    if (preflight.chain.kind === "registered") return true;
    if (preflight.proof.kind === "found" && preflight.proof.matches === false)
      return true;
    if (preflight.proof.kind === "malformed") return true;
    return false;
  })();

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
      if (hash) {
        setTxHash(hash);
        if (addr) recordRepoActivity(addr, slug, "maintainer");
      }
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
            className="text-5xl sm:text-6xl md:text-7xl text-(--ink-display) tracking-tight leading-[0.95] animate-fade-rise"
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
              <pre className="px-6 py-8 md:px-10 md:py-10 font-mono text-lg md:text-2xl leading-[1.6] text-(--ink-display) overflow-x-auto tabular-nums" tabIndex={0}>
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
              disabled={submitting || !addr || blockSubmit}
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

            <PreflightRows preflight={preflight} hasWallet={!!addr} />

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
                <NextStep slug={preflight.slug} />
              </div>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

// ---------------------------------------------------------------------------
// Preflight rows: surface what we know about the slug + .gitdrip.json file
// before the user spends gas trying to register.
// ---------------------------------------------------------------------------
function PreflightRows({
  preflight,
  hasWallet,
}: {
  preflight: ReturnType<typeof useRegisterPreflight>;
  hasWallet: boolean;
}) {
  if (!preflight.slug) return null;

  const proofRow = (() => {
    const p = preflight.proof;
    if (p.kind === "checking") {
      return (
        <CheckRow status={"checking" as CheckStatus}>
          Looking for .gitdrip.json on the default branch…
        </CheckRow>
      );
    }
    if (p.kind === "missing") {
      return (
        <CheckRow status={"warn" as CheckStatus}>
          .gitdrip.json isn&apos;t on the default branch yet. Push the file
          above first, then try again.
        </CheckRow>
      );
    }
    if (p.kind === "malformed") {
      return (
        <CheckRow status={"fail" as CheckStatus}>
          Found .gitdrip.json but it&apos;s not valid JSON or missing{" "}
          <span className="font-mono">maintainer_wallet</span>.
        </CheckRow>
      );
    }
    if (p.kind === "found") {
      if (!hasWallet) {
        return (
          <CheckRow status={"warn" as CheckStatus}>
            Found .gitdrip.json (wallet:{" "}
            <span className="font-mono break-all">{p.walletInFile}</span>).
            Connect to verify it matches yours.
          </CheckRow>
        );
      }
      if (p.matches === true) {
        return (
          <CheckRow status={"pass" as CheckStatus}>
            .gitdrip.json found and the wallet matches yours. Ready to register.
          </CheckRow>
        );
      }
      return (
        <CheckRow status={"fail" as CheckStatus}>
          The wallet in .gitdrip.json (
          <span className="font-mono break-all">{p.walletInFile}</span>)
          doesn&apos;t match the connected wallet. Update the file or connect
          the right wallet.
        </CheckRow>
      );
    }
    return null;
  })();

  const chainRow = (() => {
    const c = preflight.chain;
    if (c.kind === "checking") {
      return (
        <CheckRow status={"checking" as CheckStatus}>
          Checking on-chain…
        </CheckRow>
      );
    }
    if (c.kind === "registered") {
      if (c.mine) {
        return (
          <CheckRow status={"warn" as CheckStatus}>
            You already registered this repo. Nothing to do here — the
            register page is one-shot per slug.
          </CheckRow>
        );
      }
      return (
        <CheckRow status={"fail" as CheckStatus}>
          Already registered on-chain by another wallet (
          <span className="font-mono break-all">{c.record.maintainer}</span>).
        </CheckRow>
      );
    }
    if (c.kind === "unregistered") {
      return (
        <CheckRow status={"pass" as CheckStatus}>
          Slug is free on-chain.
        </CheckRow>
      );
    }
    return null;
  })();

  return (
    <div className="mt-5 flex flex-col gap-2">
      {chainRow && (
        <div className="animate-fade-rise" style={{ animationDuration: "0.4s" }}>
          {chainRow}
        </div>
      )}
      {proofRow && (
        <div
          className="animate-fade-rise"
          style={{ animationDuration: "0.4s", animationDelay: "0.12s" }}
        >
          {proofRow}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Next-step pill — appears after a successful tx submission
// ---------------------------------------------------------------------------
function NextStep({ slug }: { slug: string }) {
  if (!slug) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-3">
      <a
        href={`/sponsor/${slug}`}
        className="inline-flex items-center gap-1 text-sm text-(--accent-driprose) hover:text-(--accent-driprose-hover) underline underline-offset-4"
      >
        Share /sponsor/{slug} with backers
        <ArrowRight aria-hidden className="w-3.5 h-3.5" />
      </a>
      <a
        href={`/dashboard/${slug}`}
        className="inline-flex items-center gap-1 text-sm text-(--ink-muted) hover:text-(--accent-driprose) underline underline-offset-4"
      >
        Open the dashboard
        <ArrowRight aria-hidden className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}
