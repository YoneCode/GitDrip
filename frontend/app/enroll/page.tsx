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
import { useEnrollPreflight } from "@/hooks/use-enroll-preflight";
import { CheckRow, type CheckStatus } from "@/components/check-row";
import { recordRepoActivity } from "@/lib/profile";

export default function EnrollPage() {
  const { ready, login, address: addr } = useWallet();
  const [repo, setRepo] = useState("");
  const [ghLogin, setGhLogin] = useState("");
  const [gistId, setGistId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const slug = repo
    .trim()
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/\/$/, "");

  const gistBody =
    addr && slug
      ? `gitdrip:${slug}:${addr.toLowerCase()}`
      : "gitdrip:<owner/repo>:<your-wallet>";
  const typedGist = useTypewriter(gistBody, 600);
  const txStatus = useTxStatus(txHash);

  const preflight = useEnrollPreflight(
    repo,
    ghLogin,
    gistId,
    addr ? addr.toLowerCase() : null,
  );

  const blockSubmit = (() => {
    if (!preflight.slug) return false;
    if (preflight.repo.kind === "unregistered") return true;
    if (preflight.repo.kind === "registered" && preflight.repo.alreadyEnrolled)
      return true;
    if (preflight.gist.kind === "missing") return true;
    if (preflight.gist.kind === "wrong_owner") return true;
    if (preflight.gist.kind === "missing_body") return true;
    return false;
  })();

  const copyGist = () => {
    void navigator.clipboard.writeText(gistBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const onEnroll = async () => {
    setError(null);
    setTxHash(null);
    if (!slug || !slug.includes("/")) {
      setError("enter owner/repo first so we can fill the gist template");
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
      const hash =
        typeof tx === "string" ? tx : (tx?.hash ?? tx?.transactionHash);
      if (hash) {
        setTxHash(hash);
        if (addr) recordRepoActivity(addr, slug, "contributor");
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
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-(--accent-driprose) mb-4">
            contributor
          </p>
          <h1
            className="text-5xl sm:text-6xl md:text-7xl text-(--ink-display) tracking-tight leading-[0.95] animate-fade-rise"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Publish This Gist.
            <br />
            <span className="text-(--ink-muted)">We Verify the Rest.</span>
          </h1>

          {/* Wallet + repo inline status */}
          <div className="mt-10 flex flex-col gap-3 max-w-2xl">
            <div className="flex items-center gap-3 text-sm">
              <Wallet
                aria-hidden
                className={`w-4 h-4 ${addr ? "text-(--accent-driprose)" : "text-(--ink-faint)"}`}
              />
              {addr ? (
                <>
                  <span className="text-(--ink-muted) font-mono">
                    connected
                  </span>
                  <span className="font-mono text-(--ink-body)">{addr}</span>
                </>
              ) : (
                <>
                  <span className="text-(--ink-muted)">
                    no wallet connected
                  </span>
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
            <div>
              <label
                htmlFor="repo-slug"
                className="block font-mono text-xs uppercase tracking-[0.14em] text-(--ink-muted) mb-2"
              >
                repo to enroll in
              </label>
              <Input
                id="repo-slug"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="owner/repo"
                className="h-11 font-mono bg-(--surface-sunken) border-(--rule) max-w-md"
              />
            </div>
          </div>

          {/* GIST BODY — the centerpiece */}
          <div className="mt-12">
            <div className="overflow-hidden border border-(--rule-strong) bg-(--surface-sunken) rounded-md">
              <div className="flex items-center justify-between border-b border-(--rule) px-5 py-3 bg-(--surface-card)">
                <span className="font-mono text-sm text-(--ink-body)">
                  gist contents
                </span>
                <button
                  type="button"
                  onClick={copyGist}
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-(--ink-muted) hover:text-(--accent-driprose) transition-colors px-2 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="copy gist body"
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
              <pre className="px-6 py-8 md:px-10 md:py-10 font-mono text-lg md:text-2xl leading-[1.6] text-(--ink-display) overflow-x-auto break-all" tabIndex={0}>
                <code>
                  {typedGist}
                  {typedGist.length < gistBody.length && (
                    <span className="inline-block w-[0.5ch] h-[1em] bg-(--accent-driprose) align-middle animate-pulse ml-0.5" />
                  )}
                </code>
              </pre>
            </div>
            <p className="mt-4 text-sm text-(--ink-muted) max-w-[60ch]">
              create a{" "}
              <a
                href="https://gist.github.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-(--accent-driprose) hover:text-(--accent-driprose-hover) underline underline-offset-2"
              >
                public gist
              </a>{" "}
              with one file containing this line. copy the gist id from the
              URL: gist.github.com/your-login/<strong>HEX_ID_HERE</strong>.
            </p>
          </div>

          {/* Submit form */}
          <div className="mt-16 border-t border-(--rule) pt-10">
            <h2
              className="text-2xl md:text-3xl text-(--ink-display) mb-6"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Once It&apos;s Published, Enroll On-chain
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
              <div>
                <label
                  htmlFor="login"
                  className="block font-mono text-xs uppercase tracking-[0.14em] text-(--ink-muted) mb-2"
                >
                  github login
                </label>
                <Input
                  id="login"
                  value={ghLogin}
                  onChange={(e) => setGhLogin(e.target.value)}
                  placeholder="your-github-username"
                  className="h-11 font-mono bg-(--surface-sunken) border-(--rule)"
                />
              </div>
              <div>
                <label
                  htmlFor="gist"
                  className="block font-mono text-xs uppercase tracking-[0.14em] text-(--ink-muted) mb-2"
                >
                  gist id
                </label>
                <Input
                  id="gist"
                  value={gistId}
                  onChange={(e) => setGistId(e.target.value)}
                  placeholder="abc123def456..."
                  className="h-11 font-mono bg-(--surface-sunken) border-(--rule)"
                />
              </div>
            </div>

            <Button
              onClick={onEnroll}
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
                  Enroll
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
// Preflight rows: inline, real-time confirmation that everything is in place
// before the user spends gas trying to enroll.
// ---------------------------------------------------------------------------
function PreflightRows({
  preflight,
  hasWallet,
}: {
  preflight: ReturnType<typeof useEnrollPreflight>;
  hasWallet: boolean;
}) {
  if (!preflight.slug) return null;

  const repoRow = (() => {
    const r = preflight.repo;
    if (r.kind === "checking") {
      return (
        <CheckRow status={"checking" as CheckStatus}>
          Checking that the repo is registered…
        </CheckRow>
      );
    }
    if (r.kind === "unregistered") {
      return (
        <CheckRow status={"fail" as CheckStatus}>
          This repo isn&apos;t registered on-chain yet. Ask the maintainer to
          register it first.
        </CheckRow>
      );
    }
    if (r.kind === "registered") {
      if (r.alreadyEnrolled) {
        return (
          <CheckRow status={"warn" as CheckStatus}>
            Your wallet is already enrolled as{" "}
            <span className="font-mono">{r.enrolledLogin}</span>. Nothing more
            to do here.
          </CheckRow>
        );
      }
      return (
        <CheckRow status={"pass" as CheckStatus}>
          Repo is registered. Ready to add you to the roster.
        </CheckRow>
      );
    }
    return null;
  })();

  const gistRow = (() => {
    const g = preflight.gist;
    if (g.kind === "checking") {
      return (
        <CheckRow status={"checking" as CheckStatus}>
          Fetching the gist…
        </CheckRow>
      );
    }
    if (g.kind === "missing") {
      return (
        <CheckRow status={"fail" as CheckStatus}>
          Gist not found. Double-check the id you pasted.
        </CheckRow>
      );
    }
    if (g.kind === "private") {
      return (
        <CheckRow status={"warn" as CheckStatus}>
          Gist exists but isn&apos;t public. Make it public so the contract
          can read it.
        </CheckRow>
      );
    }
    if (g.kind === "wrong_owner") {
      return (
        <CheckRow status={"fail" as CheckStatus}>
          This gist is owned by{" "}
          <span className="font-mono">{g.actualOwner}</span>, not the login
          you typed.
        </CheckRow>
      );
    }
    if (g.kind === "missing_body") {
      return (
        <CheckRow status={"fail" as CheckStatus}>
          Gist body doesn&apos;t contain{" "}
          <span className="font-mono break-all">{g.expected}</span>. Copy the
          line above into the gist exactly.
        </CheckRow>
      );
    }
    if (g.kind === "found") {
      if (!hasWallet) {
        return (
          <CheckRow status={"warn" as CheckStatus}>
            Gist looks valid. Connect a wallet to verify the body matches you.
          </CheckRow>
        );
      }
      return (
        <CheckRow status={"pass" as CheckStatus}>
          Gist is public, owned by{" "}
          <span className="font-mono">{g.owner}</span>, and contains the proof
          line. Ready to enroll.
        </CheckRow>
      );
    }
    return null;
  })();

  return (
    <div className="mt-5 flex flex-col gap-2">
      {repoRow && (
        <div className="animate-fade-rise" style={{ animationDuration: "0.4s" }}>
          {repoRow}
        </div>
      )}
      {gistRow && (
        <div
          className="animate-fade-rise"
          style={{ animationDuration: "0.4s", animationDelay: "0.12s" }}
        >
          {gistRow}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// After-success next step
// ---------------------------------------------------------------------------
function NextStep({ slug }: { slug: string }) {
  if (!slug) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-3">
      <a
        href="/claim"
        className="inline-flex items-center gap-1 text-sm text-(--accent-driprose) hover:text-(--accent-driprose-hover) underline underline-offset-4"
      >
        Watch your /claim balance
        <ArrowRight aria-hidden className="w-3.5 h-3.5" />
      </a>
      <a
        href={`/dashboard/${slug}`}
        className="inline-flex items-center gap-1 text-sm text-(--ink-muted) hover:text-(--accent-driprose) underline underline-offset-4"
      >
        See {slug} on the dashboard
        <ArrowRight aria-hidden className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}
