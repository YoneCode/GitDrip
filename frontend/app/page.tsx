import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export default function Page() {
  return (
    <>
      <SiteHeader />

      <main>
        {/* Hero — asymmetric, dramatic scale break */}
        <section className="px-6 md:px-12 lg:px-20 pt-20 md:pt-32 pb-20 md:pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 lg:gap-20 items-end max-w-6xl">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-(--accent-driprose) mb-6">
                continuous sponsorship for open source
              </p>
              <h1 className="font-display font-semibold text-(--ink-display) text-[clamp(3.2rem,8vw,6.5rem)] leading-[0.88] tracking-tight">
                fund the
                <br />
                code that
                <br />
                <span className="text-(--accent-driprose)">ships.</span>
              </h1>
            </div>

            {/* Right column — the "live tension" element: a stylized score preview */}
            <div className="hidden lg:block w-[280px] border-l border-(--rule) pl-8">
              <p className="font-mono text-xs uppercase tracking-[0.15em] text-(--ink-faint) mb-4">
                last distribution
              </p>
              <div className="space-y-3">
                <ScoreLine name="alice" score={72} />
                <ScoreLine name="bob" score={48} />
                <ScoreLine name="carol" score={15} />
                <ScoreLine name="dependabot" score={0} />
              </div>
              <p className="mt-4 font-mono text-xs text-(--ink-faint)">
                scored by 5 validators, on-chain
              </p>
            </div>
          </div>

          {/* Subtitle + CTAs below the fold of the huge type */}
          <p className="mt-12 md:mt-16 text-xl leading-relaxed text-(--ink-body) max-w-[50ch]">
            sponsors deposit. AI validators read every commit diff and score substance.
            the pool splits proportionally. zero humans in the loop.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
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
        </section>

        <hr />

        {/* How it works — staggered, not identical rhythm */}
        <section className="px-6 md:px-12 lg:px-20 py-20 md:py-28">
          <div className="max-w-5xl">
            <h2 className="font-display text-3xl md:text-4xl text-(--ink-display) tracking-tight mb-16">
              three steps, then it runs itself
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
              <StepCard
                n="01"
                title="register"
                body="maintainer commits .gitdrip.json with their wallet. contract verifies ownership on-chain."
              />
              <StepCard
                n="02"
                title="deposit"
                body="anyone sponsors the pool. tracked individually. refundable after 180 days dormant."
              />
              <StepCard
                n="03"
                title="score + split"
                body="validators fetch diffs, LLM scores 0-100 by substance. pool distributes. claim() to withdraw."
              />
            </div>
          </div>
        </section>

        <hr />

        {/* Differentiator — horizontal scan, not a tall table */}
        <section className="px-6 md:px-12 lg:px-20 py-20 md:py-28">
          <div className="max-w-5xl">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-(--accent-driprose) mb-4">
              vs existing tools
            </p>
            <h2 className="font-display text-3xl md:text-4xl text-(--ink-display) tracking-tight mb-4">
              the split self-adjusts
            </h2>
            <p className="text-(--ink-muted) text-lg mb-10 max-w-[45ch]">
              that is the only feature that matters. everything else is table stakes.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <CompCard tool="GitHub Sponsors" line="custodial. monthly. manual." />
              <CompCard tool="Gitcoin Grants" line="round-based. quadratic." />
              <CompCard tool="Drips Network" line="streams. manual splits." />
              <CompCard tool="GitDrip" line="continuous. AI-scored. automatic." highlight />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

function ScoreLine({ name, score }: { name: string; score: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-sm text-(--ink-body) w-24 truncate">{name}</span>
      <div className="flex-1 h-1.5 bg-(--surface-sunken) rounded-sm overflow-hidden">
        <div
          className="h-full bg-(--accent-driprose) rounded-sm"
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="font-mono text-xs text-(--ink-muted) w-6 text-right tabular-nums">
        {score}
      </span>
    </div>
  );
}

function StepCard({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="border-t border-(--rule-strong) pt-6">
      <span className="font-mono text-sm text-(--accent-driprose)">{n}</span>
      <h3 className="font-display text-xl text-(--ink-display) mt-2 mb-3">{title}</h3>
      <p className="text-(--ink-muted) text-sm leading-relaxed">{body}</p>
    </div>
  );
}

function CompCard({
  tool,
  line,
  highlight = false,
}: {
  tool: string;
  line: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`border px-5 py-4 ${
        highlight
          ? "border-(--accent-driprose) bg-(--accent-driprose-soft)"
          : "border-(--rule)"
      }`}
    >
      <p className={`font-display text-base mb-1 ${highlight ? "text-(--accent-driprose)" : "text-(--ink-display)"}`}>
        {tool}
      </p>
      <p className={`text-sm ${highlight ? "text-(--ink-body)" : "text-(--ink-muted)"}`}>
        {line}
      </p>
    </div>
  );
}
