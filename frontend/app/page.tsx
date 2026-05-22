import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export default function Page() {
  return (
    <>
      <SiteHeader />

      <main>
        {/* Hero — full width, left-aligned, bold type */}
        <section className="px-6 md:px-12 lg:px-20 pt-32 pb-24">
          <div className="max-w-5xl">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-(--accent-driprose) mb-6">
              on-chain sponsorship, ai-scored
            </p>
            <h1 className="font-display font-semibold text-(--ink-display) text-[clamp(3rem,7vw,5.5rem)] leading-[0.95] tracking-tight max-w-[14ch]">
              fund the code that ships.
            </h1>
            <p className="mt-10 text-xl leading-relaxed text-(--ink-body) max-w-[52ch]">
              sponsors deposit into a repo pool. every week, AI validators score
              each contributor by the substance of their commits. the pool splits
              proportionally. bots get zero. typos get one. features get fifty.
            </p>

            <div className="mt-12 flex gap-4">
              <Button
                asChild
                className="bg-(--accent-driprose) hover:bg-(--accent-driprose-hover) text-(--accent-on-driprose) h-12 px-7 text-base font-medium"
              >
                <Link href="/sponsor/genlayerlabs/genvm">
                  sponsor a repo
                  <ArrowRight aria-hidden className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="h-12 px-7 text-base text-(--ink-body) hover:bg-(--surface-card) border border-(--rule)"
              >
                <Link href="/claim">claim payout</Link>
              </Button>
            </div>
          </div>
        </section>

        <hr />

        {/* How it works — big numbered steps, left-aligned */}
        <section className="px-6 md:px-12 lg:px-20 py-24">
          <div className="max-w-5xl">
            <h2 className="font-display text-4xl md:text-5xl text-(--ink-display) tracking-tight mb-16">
              how it works
            </h2>
            <div className="space-y-16">
              <Step
                n="01"
                title="maintainer registers"
                body="commit .gitdrip.json with your wallet to the repo root. call register_repo. the contract verifies ownership via raw.githubusercontent.com."
              />
              <Step
                n="02"
                title="sponsors deposit"
                body="anyone sends GLT to the repo pool. each deposit tracked individually. refundable after 180 days dormant."
              />
              <Step
                n="03"
                title="validators score, pool splits"
                body="every 7 days, GenLayer validators fetch commits and diffs. LLM scores substance 0-100. pool distributes proportionally. contributors call claim()."
              />
            </div>
          </div>
        </section>

        <hr />

        {/* Differentiator */}
        <section className="px-6 md:px-12 lg:px-20 py-24">
          <div className="max-w-5xl">
            <h2 className="font-display text-4xl md:text-5xl text-(--ink-display) tracking-tight mb-6">
              not like the others
            </h2>
            <p className="text-(--ink-muted) text-lg mb-12 max-w-[50ch]">
              the split self-adjusts to real contribution. everything else is table stakes.
            </p>

            <div className="border border-(--rule) divide-y divide-(--rule)">
              <CompRow tool="GitHub Sponsors" desc="custodial, monthly, manual splits" />
              <CompRow tool="Gitcoin Grants" desc="round-based, quadratic, curated" />
              <CompRow tool="Drips Network" desc="on-chain streams, manual percentages" />
              <CompRow
                tool="GitDrip"
                desc="on-chain, continuous, AI-scored auto-splits"
                highlight
              />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="grid grid-cols-[4rem_1fr] md:grid-cols-[5rem_1fr] gap-6 items-start">
      <span className="font-display text-5xl md:text-6xl text-(--accent-driprose) leading-none">
        {n}
      </span>
      <div>
        <h3 className="font-display text-2xl md:text-3xl text-(--ink-display) mb-3">
          {title}
        </h3>
        <p className="text-(--ink-body) text-lg leading-relaxed max-w-[55ch]">
          {body}
        </p>
      </div>
    </div>
  );
}

function CompRow({
  tool,
  desc,
  highlight = false,
}: {
  tool: string;
  desc: string;
  highlight?: boolean;
}) {
  return (
    <div className={`grid grid-cols-[12rem_1fr] gap-6 px-6 py-5 ${highlight ? "bg-(--surface-card)" : ""}`}>
      <span className={`font-display text-lg ${highlight ? "text-(--accent-driprose)" : "text-(--ink-muted)"}`}>
        {tool}
      </span>
      <span className={`text-base ${highlight ? "text-(--ink-display)" : "text-(--ink-body)"}`}>
        {desc}
      </span>
    </div>
  );
}
