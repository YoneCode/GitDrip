import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export default function Page() {
  return (
    <>
      <SiteHeader />

      <main>
        {/* Hero — single column, centered editorial. */}
        <section className="mx-auto max-w-[680px] px-6 pt-24 pb-20 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-(--ink-faint) mb-8">
            on-chain · sponsorship · ai-scored
          </p>
          <h1 className="font-display font-semibold text-(--ink-display) text-[clamp(2.4rem,5vw,3.5rem)] leading-[1.05] tracking-tight">
            Drips for code that earns its weight.
          </h1>
          <p className="mt-8 text-lg leading-relaxed text-(--ink-body) max-w-[55ch] mx-auto">
            GitDrip splits open-source sponsorship pools by the substance of
            each commit, judged by AI validators on chain. A typo gets one. A
            new feature gets fifty. Bots get nothing. The score is public,
            the payout is automatic, the rule is the contract.
          </p>

          <div className="mt-10 flex flex-wrap gap-3 justify-center">
            <Button
              asChild
              className="bg-(--accent-driprose) hover:bg-(--accent-driprose-hover) text-(--accent-on-driprose) h-11 px-5"
            >
              <Link href="/sponsor/genlayerlabs/genvm">
                sponsor a repo
                <ArrowRight aria-hidden className="w-4 h-4 ml-1.5" />
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="h-11 px-5 hover:bg-(--surface-sunken)"
            >
              <Link href="/claim">claim a payout</Link>
            </Button>
          </div>
        </section>

        <hr />

        {/* How it works — three steps as numbered prose, not three cards. */}
        <section className="mx-auto max-w-3xl px-6 py-20">
          <h2 className="font-display text-3xl text-(--ink-display) mb-10">
            How a period works
          </h2>
          <ol className="space-y-10">
            <Step
              n={1}
              title="A maintainer registers."
              body={
                "They commit `.gitdrip.json` to the repo with their wallet, " +
                "then call register_repo. The contract fetches the file from " +
                "raw.githubusercontent.com and accepts only if the wallets match."
              }
            />
            <Step
              n={2}
              title="Sponsors deposit."
              body={
                "Anyone can sponsor a repo's pool. Each deposit is tracked " +
                "individually so it can be refunded after 180 days of dormancy."
              }
            />
            <Step
              n={3}
              title="Validators score, the pool splits."
              body={
                "Every seven days (or per release tag), GenLayer validators fetch " +
                "each opted-in contributor's commits and diffs. An LLM scores them " +
                "0–100 by substance. The pool splits proportionally and lands in " +
                "each contributor's pending balance, ready to claim."
              }
            />
          </ol>
        </section>

        <hr />

        {/* What makes it different. Comparison without a table on mobile. */}
        <section className="mx-auto max-w-3xl px-6 py-20">
          <h2 className="font-display text-3xl text-(--ink-display) mb-3">
            Different from what came before
          </h2>
          <p className="text-(--ink-muted) max-w-[60ch]">
            The split self-adjusts. That&apos;s the headline.
          </p>

          <dl className="mt-10 divide-y divide-(--rule) border-y border-(--rule)">
            <Row k="GitHub Sponsors" v="Custodial. Monthly. Manual." />
            <Row k="Gitcoin Grants" v="Round-based. Quadratic. Curated." />
            <Row k="Drips Network" v="On-chain streams. Splits set by hand." />
            <Row
              k="GitDrip"
              v="On-chain, continuous, splits self-adjust to each contributor's substance."
              accent
            />
          </dl>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

function Step({
  n,
  title,
  body,
}: {
  n: number;
  title: string;
  body: string;
}) {
  return (
    <li className="grid grid-cols-[3rem_1fr] gap-6 items-baseline">
      <span className="font-display text-3xl text-(--accent-driprose) tabular-nums">
        {n.toString().padStart(2, "0")}
      </span>
      <div>
        <h3 className="font-display text-xl text-(--ink-display) mb-2">
          {title}
        </h3>
        <p className="text-(--ink-body) leading-relaxed max-w-[60ch]">
          {body}
        </p>
      </div>
    </li>
  );
}

function Row({
  k,
  v,
  accent = false,
}: {
  k: string;
  v: string;
  accent?: boolean;
}) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-6 py-4">
      <dt
        className={
          accent
            ? "font-display text-lg text-(--accent-driprose)"
            : "text-(--ink-muted)"
        }
      >
        {k}
      </dt>
      <dd
        className={
          accent
            ? "text-(--ink-display) leading-relaxed"
            : "text-(--ink-body) leading-relaxed"
        }
      >
        {v}
      </dd>
    </div>
  );
}
