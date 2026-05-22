"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Address } from "@/components/address";
import { WeiAmount } from "@/components/wei-amount";
import { TxLink } from "@/components/tx-link";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { claim, getPending } from "@/lib/contract";
import { connectWallet } from "@/lib/genlayer";

export default function ClaimPage() {
  const [addr, setAddr] = useState<`0x${string}` | null>(null);
  const [pending, setPending] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!addr) {
      setPending(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getPending(addr)
      .then((p) => !cancelled && setPending(p))
      .catch(() => !cancelled && setPending(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [addr, txHash]);

  const onConnect = async () => {
    setError(null);
    const a = await connectWallet();
    if (a) setAddr(a);
    else setError("wallet not available");
  };

  const onClaim = async () => {
    setError(null);
    setTxHash(null);
    try {
      setSubmitting(true);
      const tx = await claim();
      const hash =
        typeof tx === "string" ? tx : (tx?.hash ?? tx?.transactionHash);
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
          claim a payout
        </p>
        <h1 className="font-display text-4xl text-(--ink-display) tracking-tight">
          your pending balance
        </h1>
        <p className="mt-3 text-(--ink-muted) max-w-[60ch]">
          The contract holds your share until you withdraw. One transaction,
          all of it at once.
        </p>

        <div className="mt-12">
          {!addr ? (
            <Button
              onClick={onConnect}
              className="bg-(--accent-driprose) hover:bg-(--accent-driprose-hover) text-(--accent-on-driprose) h-11 px-6"
            >
              connect wallet
            </Button>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 md:gap-12 items-end border-y border-(--rule) py-10">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-(--ink-muted) mb-2">
                  for <Address value={addr} />
                </p>
                <p className="font-display text-5xl text-(--ink-display) tabular-nums">
                  {loading ? "—" : (
                    <WeiAmount
                      value={pending ?? 0n}
                      fractionDigits={6}
                    />
                  )}
                </p>
              </div>
              <Button
                onClick={onClaim}
                disabled={
                  submitting ||
                  loading ||
                  !pending ||
                  pending === 0n
                }
                className="bg-(--accent-driprose) hover:bg-(--accent-driprose-hover) text-(--accent-on-driprose) h-12 px-7"
              >
                {submitting ? (
                  <>
                    <Loader2
                      aria-hidden
                      className="w-4 h-4 mr-2 animate-spin"
                    />
                    claiming
                  </>
                ) : (
                  <>
                    claim now
                    <ArrowRight aria-hidden className="w-4 h-4 ml-1.5" />
                  </>
                )}
              </Button>
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="mt-6 inline-flex items-center gap-2 text-sm text-(--status-bad)"
            >
              <AlertTriangle aria-hidden className="w-4 h-4" />
              {error}
            </p>
          )}

          {txHash && (
            <p className="mt-6 text-sm text-(--ink-body)" aria-live="polite">
              submitted ·{" "}
              <TxLink hash={txHash} /> · refresh after a few seconds
            </p>
          )}

          {addr && pending !== null && pending === 0n && !error && !txHash && (
            <p className="mt-8 text-(--ink-muted) leading-relaxed max-w-[55ch]">
              Nothing to claim yet. Your balance fills after a distribution
              run scores you above zero, on a repo where you&apos;ve enrolled
              your GitHub login.
            </p>
          )}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
