"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Address } from "@/components/address";
import { WeiAmount } from "@/components/wei-amount";
import { TxLink } from "@/components/tx-link";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { getRepo, sponsor, type RepoRecord } from "@/lib/contract";
import { parseGlt } from "@/lib/format";
import { humanError } from "@/lib/errors";
import { explorerContract } from "@/lib/genlayer";

export default function SponsorPageClient({
  params,
}: {
  params: Promise<{ repo: string[] }>;
}) {
  const { repo: repoSegments } = use(params);
  const repoSlug = repoSegments?.join("/") ?? "";

  const [record, setRecord] = useState<RepoRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("0.5");
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getRepo(repoSlug)
      .then((r) => !cancelled && setRecord(r))
      .catch(() => !cancelled && setRecord(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [repoSlug]);

  const onSponsor = async () => {
    setError(null);
    setTxHash(null);
    try {
      setSubmitting(true);
      const wei = parseGlt(amount);
      if (wei <= 0n) {
        setError("amount must be greater than zero");
        return;
      }
      const tx = await sponsor(repoSlug, wei);
      const hash =
        typeof tx === "string" ? tx : (tx?.hash ?? tx?.transactionHash);
      if (hash) setTxHash(hash);
    } catch (e: unknown) {
      const msg = humanError(e instanceof Error ? e.message : String(e));
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SiteHeader />

      <main className="px-6 md:px-12 lg:px-20 py-20"><div className="max-w-5xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-(--accent-driprose) mb-3">
          sponsor a repo
        </p>
        <h1 className="font-display text-5xl md:text-6xl text-(--ink-display) tracking-tight leading-[0.95]">
          {repoSlug || "—"}
        </h1>
        <p className="mt-3 text-(--ink-muted) max-w-[60ch]">
          Funds go into the on-chain pool for{" "}
          <span className="font-mono">{repoSlug}</span>. They split among
          opted-in contributors after the next AI scoring run.
        </p>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem] gap-12">
          {/* Left: action */}
          <section>
            <label
              htmlFor="amount"
              className="block font-mono text-xs uppercase tracking-[0.14em] text-(--ink-muted) mb-2"
            >
              amount (GLT)
            </label>
            <Input
              id="amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-12 text-lg font-mono tabular-nums"
              placeholder="0.5"
            />

            {error && (
              <p
                role="alert"
                className="mt-3 inline-flex items-center gap-2 text-sm text-(--status-bad)"
              >
                <AlertTriangle aria-hidden className="w-4 h-4" />
                {error}
              </p>
            )}

            {txHash && (
              <p className="mt-3 text-sm text-(--ink-body)" aria-live="polite">
                submitted ·{" "}
                <TxLink hash={txHash} />
              </p>
            )}

            <div className="mt-6">
              <Button
                onClick={onSponsor}
                disabled={submitting || loading || !record}
                className="bg-(--accent-driprose) hover:bg-(--accent-driprose-hover) text-(--accent-on-driprose) h-11 px-6"
              >
                {submitting ? (
                  <>
                    <Loader2
                      aria-hidden
                      className="w-4 h-4 mr-2 animate-spin"
                    />
                    submitting
                  </>
                ) : (
                  <>
                    sponsor {amount || "0"} GLT
                    <ArrowRight aria-hidden className="w-4 h-4 ml-1.5" />
                  </>
                )}
              </Button>
            </div>

            {!record && !loading && (
              <div className="border-t border-(--rule) pt-8 mt-8">
                <h2 className="font-display text-2xl text-(--ink-display) mb-3">
                  not registered yet
                </h2>
                <p className="text-(--ink-muted) leading-relaxed max-w-[50ch]">
                  <span className="font-mono text-(--ink-body)">{repoSlug}</span> needs
                  to be registered before it can receive sponsorships. the maintainer
                  commits a <code className="font-mono text-(--ink-body)">.gitdrip.json</code>{" "}
                  file, then calls register_repo.
                </p>
                <Button
                  asChild
                  variant="ghost"
                  className="mt-4 border border-(--rule) h-10 px-5"
                >
                  <Link href="/register">go to register</Link>
                </Button>
              </div>
            )}
          </section>

          {/* Right: live state */}
          <aside>
            <h2 className="font-display text-lg text-(--ink-display) mb-4">
              repo state
            </h2>
            {loading ? (
              <p className="text-(--ink-faint) text-sm">reading from chain…</p>
            ) : record ? (
              <dl className="space-y-3 text-sm">
                <Row label="maintainer">
                  <Address value={record.maintainer} />
                </Row>
                <Row label="pool">
                  <WeiAmount value={BigInt(record.pool_wei)} />
                </Row>
                <Row label="distributions">
                  <span className="tabular-nums">
                    {record.distribution_count}
                  </span>
                </Row>
                <Row label="total distributed">
                  <WeiAmount value={BigInt(record.total_distributed_wei)} />
                </Row>
                <Row label="contract">
                  <Link
                    href={explorerContract()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-(--accent-driprose) hover:text-(--accent-driprose-hover) underline underline-offset-2"
                  >
                    explorer ↗
                  </Link>
                </Row>
              </dl>
            ) : (
              <p className="text-(--ink-faint) text-sm">unregistered</p>
            )}
          </aside>
        </div>
      </div></main>

      <SiteFooter />
    </>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3 py-2 border-b border-(--rule) last:border-b-0">
      <dt className="text-(--ink-muted) font-mono text-xs uppercase tracking-[0.12em]">
        {label}
      </dt>
      <dd className="text-(--ink-body)">{children}</dd>
    </div>
  );
}

