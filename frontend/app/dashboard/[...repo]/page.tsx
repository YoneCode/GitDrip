"use client";

import { use, useEffect, useState } from "react";
import { useWallet } from "@/hooks/use-wallet";
import Link from "next/link";
import { ArrowRight, AlertTriangle, Loader2 } from "lucide-react";
import { Address } from "@/components/address";
import { WeiAmount } from "@/components/wei-amount";
import { ScoreBar } from "@/components/score-bar";
import { TxLink } from "@/components/tx-link";
import { Button } from "@/components/ui/button";
import { TextSkeleton } from "@/components/skeleton";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import {
  getRepo,
  getRoster,
  getScoreLog,
  sponsorRefund,
  nextDepositId,
  getDeposit,
  type RepoRecord,
  type ScoreSnapshot,
  type Deposit,
} from "@/lib/contract";
import { formatDate, daysBetween } from "@/lib/format";
import { explorerContract } from "@/lib/genlayer";

const PERIOD_SEC = 7 * 24 * 3600;

export default function RepoDashboard({
  params,
}: {
  params: Promise<{ repo: string[] }>;
}) {
  const { repo: segments } = use(params);
  const repoSlug = segments?.join("/") ?? "";

  const [record, setRecord] = useState<RepoRecord | null>(null);
  const [roster, setRoster] = useState<Record<string, string>>({});
  const [latestSnap, setLatestSnap] = useState<ScoreSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!repoSlug) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([getRepo(repoSlug), getRoster(repoSlug)])
      .then(async ([rec, ros]) => {
        if (cancelled) return;
        setRecord(rec);
        setRoster(ros);
        if (rec && rec.distribution_count > 0) {
          const snap = await getScoreLog(repoSlug, rec.distribution_count);
          if (!cancelled) setLatestSnap(snap);
        } else {
          setLatestSnap(null);
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [repoSlug]);

  const [nowSec] = useState(() => Math.floor(Date.now() / 1000));
  const lastDist =
    record?.last_distribution_unix || record?.period_start_unix || 0;
  const nextDistAt = lastDist + PERIOD_SEC;
  const daysToNext = daysBetween(nowSec, nextDistAt);

  return (
    <>
      <SiteHeader />

      <main className="px-6 md:px-12 lg:px-20 py-20"><div className="max-w-5xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-(--accent-driprose) mb-3">
          repo
        </p>
        <div className="flex items-baseline justify-between gap-4 flex-wrap animate-fade-rise">
          <h1 className="font-display text-5xl md:text-6xl text-(--ink-display) tracking-tight leading-[0.95]">
            {repoSlug}
          </h1>
          <a
            href={`https://github.com/${repoSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-(--accent-driprose) hover:text-(--accent-driprose-hover) underline underline-offset-2"
          >
            on github ↗
          </a>
        </div>

        {loading && (
          <section className="mt-12 border-y border-(--rule) py-12">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-(--ink-faint) mb-3">
              reading from chain
            </p>
            <TextSkeleton lines={3} className="max-w-md" />
          </section>
        )}

        {!loading && !record && (
          <section className="mt-12 border-y border-(--rule) py-16">
            <h2
              className="text-3xl md:text-4xl text-(--ink-display) tracking-tight mb-4"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Not Registered Yet.
            </h2>
            <p className="text-(--ink-body) leading-relaxed max-w-[55ch]">
              <span className="font-mono">{repoSlug}</span> isn&apos;t on
              GitDrip. The maintainer can register it from{" "}
              <Link
                href="/register"
                className="text-(--accent-driprose) hover:text-(--accent-driprose-hover) underline underline-offset-4"
              >
                /register
              </Link>
              . Anyone can sponsor once it is.
            </p>
          </section>
        )}

        {!loading && record && (
          <>
            {/* Headline metrics — type-led, no card grid */}
            <section className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-12 border-y border-(--rule) py-12">
              <Stat
                label="pool"
                primary={<WeiAmount value={BigInt(record.pool_wei)} />}
                detail={`from ${record.distribution_count} ${
                  record.distribution_count === 1 ? "round" : "rounds"
                }`}
              />
              <Stat
                label="distributed"
                primary={
                  <WeiAmount value={BigInt(record.total_distributed_wei)} />
                }
                detail={`since ${formatDate(record.period_start_unix)}`}
              />
              <Stat
                label="next round"
                primary={
                  daysToNext <= 0
                    ? "ready now"
                    : `in ${daysToNext} ${daysToNext === 1 ? "day" : "days"}`
                }
                detail={`last ran ${
                  record.last_distribution_unix
                    ? formatDate(record.last_distribution_unix)
                    : "never"
                }`}
              />
            </section>

            {/* Two-column: maintainer + sponsor cta on left, last scoring on right */}
            <section className="mt-12 grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-12">
              <div>
                <h2 className="font-display text-xl text-(--ink-display) mb-4">
                  Details
                </h2>
                <dl className="text-sm space-y-2">
                  <Row label="maintainer">
                    <Address value={record.maintainer} />
                  </Row>
                  <Row label="contributors">
                    <span className="tabular-nums">
                      {Object.keys(roster).length}
                    </span>
                  </Row>
                  <Row label="last release">
                    <span className="font-mono">
                      {record.last_release_tag || "—"}
                    </span>
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

                <Button
                  asChild
                  className="mt-8 bg-(--accent-driprose) hover:bg-(--accent-driprose-hover) text-(--accent-on-driprose)"
                >
                  <Link href={`/sponsor/${repoSlug}`}>
                    Sponsor This Repo
                    <ArrowRight aria-hidden className="w-4 h-4 ml-1.5" />
                  </Link>
                </Button>

                <RefundSection repoSlug={repoSlug} record={record} />
              </div>

              <div>
                <h2 className="font-display text-xl text-(--ink-display) mb-4">
                  Latest Scoring
                </h2>
                {latestSnap ? (
                  <Snapshot snap={latestSnap} roster={roster} />
                ) : (
                  <p className="text-(--ink-muted) max-w-[60ch]">
                    No distribution has run yet. Once the pool is non-empty
                    and the period elapses, validators score every contributor
                    and the splits show up here.
                  </p>
                )}
              </div>
            </section>
          </>
        )}
      </div></main>

      <SiteFooter />
    </>
  );
}

function Stat({
  label,
  primary,
  detail,
}: {
  label: string;
  primary: React.ReactNode;
  detail: string;
}) {
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-(--ink-muted) mb-2">
        {label}
      </p>
      <p className="font-display text-3xl text-(--ink-display) tabular-nums leading-tight">
        {primary}
      </p>
      <p className="text-sm text-(--ink-faint) mt-1">{detail}</p>
    </div>
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
    <div className="grid grid-cols-[8rem_1fr] gap-3 py-2 border-b border-(--rule) last:border-b-0">
      <dt className="text-(--ink-muted) font-mono text-xs uppercase tracking-[0.12em]">
        {label}
      </dt>
      <dd className="text-(--ink-body)">{children}</dd>
    </div>
  );
}

function Snapshot({
  snap,
  roster,
}: {
  snap: ScoreSnapshot;
  roster: Record<string, string>;
}) {
  const entries = Object.entries(snap.scores).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + (v as number), 0);
  const distributed = BigInt(snap.distributed_wei || "0");

  return (
    <div className="text-sm">
      <p className="text-(--ink-muted) mb-4">
        {snap.since.slice(0, 10)} → {snap.until.slice(0, 10)} ·{" "}
        <WeiAmount value={distributed} /> distributed
      </p>

      <ul className="border-y border-(--rule) divide-y divide-(--rule)">
        {entries.map(([login, score]) => {
          const wallet = roster[login];
          const share =
            total > 0
              ? (distributed * BigInt(score as number)) / BigInt(total)
              : 0n;
          return (
            <li
              key={login}
              className="grid grid-cols-[10rem_1fr_8rem] gap-4 py-3 items-center"
            >
              <div className="min-w-0">
                <p className="font-mono text-(--ink-body) truncate">
                  {login}
                </p>
                {wallet && (
                  <span className="text-xs">
                    <Address value={wallet} />
                  </span>
                )}
              </div>
              <ScoreBar score={score as number} label={`${login} score`} />
              <div className="text-right tabular-nums text-(--ink-body)">
                <WeiAmount value={share} fractionDigits={4} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RefundSection({
  repoSlug,
  record,
}: {
  repoSlug: string;
  record: RepoRecord;
}) {
  const { address } = useWallet();
  const addr = address?.toLowerCase() ?? null;
  const [deposits, setDeposits] = useState<(Deposit & { id: bigint })[]>([]);
  const [refunding, setRefunding] = useState<bigint | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load user's deposits for this repo
  useEffect(() => {
    if (!addr) return;
    let cancelled = false;
    (async () => {
      const max = await nextDepositId();
      const mine: (Deposit & { id: bigint })[] = [];
      for (let i = 0n; i < max && i < 50n; i++) {
        const d = await getDeposit(i);
        if (d && d.repo === repoSlug && d.sponsor === addr && !d.refunded) {
          mine.push({ ...d, id: i });
        }
      }
      if (!cancelled) setDeposits(mine);
    })();
    return () => { cancelled = true; };
  }, [addr, repoSlug, txHash]);

  const DORMANT_SEC = 180 * 24 * 3600;
  const [nowSec] = useState(() => Math.floor(Date.now() / 1000));
  const lastDist = record.last_distribution_unix || record.period_start_unix;
  const isDormant = nowSec - lastDist >= DORMANT_SEC;
  const refundEligibleAt = lastDist + DORMANT_SEC;
  const daysUntilRefund = Math.max(
    0,
    Math.ceil((refundEligibleAt - nowSec) / 86400),
  );

  if (!addr || deposits.length === 0) return null;

  const onRefund = async (depositId: bigint) => {
    setError(null);
    setTxHash(null);
    try {
      setRefunding(depositId);
      const tx = await sponsorRefund(depositId);
      const hash = typeof tx === "string" ? tx : (tx?.hash ?? tx?.transactionHash);
      if (hash) setTxHash(hash);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRefunding(null);
    }
  };

  return (
    <div className="mt-8 border-t border-(--rule) pt-6">
      <h3 className="font-mono text-xs uppercase tracking-[0.14em] text-(--ink-muted) mb-3">
        Your Deposits
      </h3>
      {isDormant ? (
        <p className="text-sm text-(--status-good) mb-3">
          Refundable now — repo has been dormant for ≥ 180 days.
        </p>
      ) : (
        <p className="text-sm text-(--ink-muted) mb-3 tabular-nums">
          Refundable in {daysUntilRefund}{" "}
          {daysUntilRefund === 1 ? "day" : "days"} (after 180 days with no
          distribution).
        </p>
      )}
      <ul className="space-y-2 text-sm">
        {deposits.map((d) => (
          <li
            key={d.id.toString()}
            className="flex items-center justify-between gap-3"
          >
            <span className="tabular-nums">
              <WeiAmount value={BigInt(d.amount)} fractionDigits={4} />
            </span>
            <Button
              size="sm"
              variant="ghost"
              disabled={!isDormant || refunding !== null}
              onClick={() => onRefund(d.id)}
              className="text-xs"
            >
              {refunding === d.id ? (
                <Loader2 aria-hidden className="w-3 h-3 animate-spin" />
              ) : (
                "refund"
              )}
            </Button>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-2 text-xs text-(--status-bad) flex items-center gap-1">
          <AlertTriangle aria-hidden className="w-3 h-3" /> {error}
        </p>
      )}
      {txHash && (
        <p className="mt-2 text-xs text-(--ink-body)" aria-live="polite">
          refund submitted · <TxLink hash={txHash} />
        </p>
      )}
    </div>
  );
}
