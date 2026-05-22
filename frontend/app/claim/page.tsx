"use client";
export const dynamic = "force-dynamic";
import { useWallet } from "@/hooks/use-wallet";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WeiAmount } from "@/components/wei-amount";
import { TxLink } from "@/components/tx-link";
import { TxStatusPill } from "@/components/tx-status-pill";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { claim, getPending } from "@/lib/contract";
import { humanError } from "@/lib/errors";
import { useCountUp } from "@/hooks/use-count-up";
import { useTxStatus } from "@/hooks/use-tx-status";

export default function ClaimPage() {
  const { ready, authenticated, login, address: addr } = useWallet();

  const [pending, setPending] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const animatedPending = useCountUp(pending ?? 0n);
  const txStatus = useTxStatus(txHash);

  useEffect(() => {
    if (!addr) { setPending(null); return; }
    let cancelled = false;
    setLoading(true);
    getPending(addr)
      .then((p) => !cancelled && setPending(p))
      .catch(() => !cancelled && setPending(null))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [addr, txHash]);

  const onClaim = async () => {
    setError(null); setTxHash(null);
    try {
      setSubmitting(true);
      const tx = await claim();
      const hash = typeof tx === "string" ? tx : (tx?.hash ?? tx?.transactionHash);
      if (hash) setTxHash(hash);
    } catch (e: unknown) {
      setError(humanError(e instanceof Error ? e.message : String(e)));
    } finally {
      setSubmitting(false);
    }
  };

  const hasFunds = pending !== null && pending > 0n;
  const showTopBar = loading || submitting || (txStatus && (txStatus.stage === "pending" || txStatus.stage === "submitting"));

  return (
    <>
      {showTopBar && <div className="top-progress" aria-hidden />}
      <SiteHeader />
      <main className="px-6 md:px-12 lg:px-20 py-20 md:py-28">
        <div className="max-w-3xl">
          {!authenticated ? (
            <section>
              <h1
                className="text-5xl md:text-6xl text-(--ink-display) tracking-tight leading-[0.95] mb-6"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                Claim Your Payout
              </h1>
              <p className="text-lg text-(--ink-muted) mb-8 max-w-[45ch]">
                Connect your wallet to see your pending balance across all repos.
              </p>
              <Button
                onClick={login}
                disabled={!ready}
                className="bg-(--accent-driprose) hover:bg-(--accent-driprose-hover) text-(--accent-on-driprose) h-12 px-7 text-base"
              >
                Connect Wallet
              </Button>
            </section>
          ) : loading ? (
            <section className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-(--accent-driprose) animate-spin" />
              <span className="text-(--ink-muted)">Reading from chain...</span>
            </section>
          ) : hasFunds ? (
            <section>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-(--accent-driprose) mb-3">
                pending balance
              </p>
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 md:gap-10 border-b border-(--rule) pb-8">
                <p
                  className="text-(--ink-display) tracking-tight leading-none text-6xl md:text-7xl lg:text-8xl tabular-nums"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  <WeiAmount value={animatedPending} fractionDigits={4} />
                </p>
                <Button
                  onClick={onClaim}
                  disabled={submitting}
                  className="bg-(--accent-driprose) hover:bg-(--accent-driprose-hover) text-(--accent-on-driprose) h-12 md:h-14 px-7 md:px-9 text-base shrink-0 self-start md:self-auto"
                >
                  {submitting ? (
                    <>
                      <Loader2 aria-hidden className="w-4 h-4 mr-2 animate-spin" />
                      Claiming...
                    </>
                  ) : (
                    <>
                      Withdraw Now
                      <ArrowRight aria-hidden className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
              <p className="mt-4 text-sm text-(--ink-faint)">
                One transaction, all of it at once.
              </p>
            </section>
          ) : (
            <section>
              <h1
                className="text-5xl md:text-6xl text-(--ink-display) tracking-tight leading-[0.95] mb-4"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                Nothing To Claim Yet
              </h1>
              <p className="text-lg text-(--ink-muted) mb-10 max-w-[50ch]">
                Your balance fills after a distribution scores you above zero on a repo where you are enrolled.
              </p>
              <div className="border-t border-(--rule) pt-8 space-y-6">
                <OnboardStep n="1" text="Enroll in a registered repo" href="/enroll" />
                <OnboardStep n="2" text="Make commits that score above zero" />
                <OnboardStep n="3" text="Wait for the next distribution (every 7 days or per release)" />
                <OnboardStep n="4" text="Come back here and withdraw" />
              </div>
            </section>
          )}

          {error && (
            <p role="alert" className="mt-6 flex items-center gap-2 text-sm text-(--status-bad)">
              <AlertTriangle aria-hidden className="w-4 h-4 shrink-0" />
              {error}
            </p>
          )}
          {txHash && (
            <div className="mt-8 border-t border-(--rule) pt-6 flex flex-col gap-3" aria-live="polite">
              <TxStatusPill status={txStatus} />
              <span className="text-sm text-(--ink-muted)">
                tx · <TxLink hash={txHash} />
              </span>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function OnboardStep({ n, text, href }: { n: string; text: string; href?: string }) {
  const content = (
    <div className="flex items-start gap-4">
      <span className="font-mono text-sm text-(--accent-driprose) mt-0.5">{n}</span>
      <span className="text-(--ink-body)">{text}</span>
    </div>
  );
  if (href) return <Link href={href} className="block hover:text-(--accent-driprose) transition-colors">{content}</Link>;
  return content;
}
