"use client";
export const dynamic = "force-dynamic";
import { useWallet } from "@/hooks/use-wallet";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WeiAmount } from "@/components/wei-amount";
import { TxLink } from "@/components/tx-link";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { claim, getPending } from "@/lib/contract";
import { humanError } from "@/lib/errors";

export default function ClaimPage() {
  const { ready, authenticated, login, address: addr } = useWallet();

  const [pending, setPending] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <>
      <SiteHeader />
      <main className="px-6 md:px-12 lg:px-20 py-20 md:py-28">
        <div className="max-w-3xl">
          {/* Lead with the number — the user came here for this */}
          {!authenticated ? (
            <section>
              <h1 className="font-display text-5xl md:text-6xl text-(--ink-display) tracking-tight leading-[0.95] mb-6">
                claim your payout
              </h1>
              <p className="text-lg text-(--ink-muted) mb-8 max-w-[45ch]">
                connect your wallet to see your pending balance across all repos.
              </p>
              <Button
                onClick={login}
                disabled={!ready}
                className="bg-(--accent-driprose) hover:bg-(--accent-driprose-hover) text-(--accent-on-driprose) h-12 px-7 text-base"
              >
                connect wallet
              </Button>
            </section>
          ) : loading ? (
            <section className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-(--accent-driprose) animate-spin" />
              <span className="text-(--ink-muted)">reading from chain...</span>
            </section>
          ) : hasFunds ? (
            <section>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-(--accent-driprose) mb-3">
                pending balance
              </p>
              <p className="font-display text-6xl md:text-7xl text-(--ink-display) tracking-tight leading-none mb-8">
                <WeiAmount value={pending!} fractionDigits={4} />
              </p>
              <Button
                onClick={onClaim}
                disabled={submitting}
                className="bg-(--accent-driprose) hover:bg-(--accent-driprose-hover) text-(--accent-on-driprose) h-12 px-8 text-base"
              >
                {submitting ? (
                  <><Loader2 aria-hidden className="w-4 h-4 mr-2 animate-spin" />claiming...</>
                ) : (
                  <>withdraw now<ArrowRight aria-hidden className="w-4 h-4 ml-2" /></>
                )}
              </Button>
              <p className="mt-3 text-sm text-(--ink-faint)">
                one transaction, all of it at once.
              </p>
            </section>
          ) : (
            /* Empty state — onboarding guidance */
            <section>
              <h1 className="font-display text-5xl md:text-6xl text-(--ink-display) tracking-tight leading-[0.95] mb-4">
                nothing to claim yet
              </h1>
              <p className="text-lg text-(--ink-muted) mb-10 max-w-[50ch]">
                your balance fills after a distribution scores you above zero on a repo where you are enrolled.
              </p>
              <div className="border-t border-(--rule) pt-8 space-y-6">
                <OnboardStep n="1" text="enroll in a registered repo" href="/enroll" />
                <OnboardStep n="2" text="make commits that score above zero" />
                <OnboardStep n="3" text="wait for the next distribution (every 7 days or per release)" />
                <OnboardStep n="4" text="come back here and withdraw" />
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
            <p className="mt-6 text-sm text-(--ink-body)" aria-live="polite">
              submitted · <TxLink hash={txHash} /> · waiting for validators...
            </p>
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
