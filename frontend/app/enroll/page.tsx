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
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { client, CONTRACT_ADDRESS } from "@/lib/genlayer";
import { humanError } from "@/lib/errors";

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
      <main className="px-6 md:px-12 lg:px-20 py-16 md:py-24">
        <div className="max-w-5xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-(--accent-driprose) mb-4">
            contributor
          </p>
          <h1
            className="text-5xl sm:text-6xl md:text-7xl text-(--ink-display) tracking-tight leading-[0.95]"
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
              <pre className="px-6 py-8 md:px-10 md:py-10 font-mono text-lg md:text-2xl leading-[1.6] text-(--ink-display) overflow-x-auto break-all">
                <code>{gistBody}</code>
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
              disabled={submitting || !addr}
              className="mt-6 bg-(--accent-driprose) hover:bg-(--accent-driprose-hover) text-(--accent-on-driprose) h-12 px-7 text-base"
            >
              {submitting ? (
                <>
                  <Loader2 aria-hidden className="w-4 h-4 mr-2 animate-spin" />
                  verifying on-chain...
                </>
              ) : (
                <>
                  Enroll
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
              <p className="mt-4 text-sm text-(--ink-body)" aria-live="polite">
                submitted · <TxLink hash={txHash} /> · waiting for validators...
              </p>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
