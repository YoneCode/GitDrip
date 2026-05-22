import { Check, Minus, X } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

type Cell = { text: string; tone: "good" | "bad" | "neutral" };

type Row = {
  feature: string;
  gh: Cell;
  gc: Cell;
  drips: Cell;
  gitdrip: Cell;
};

const TOOLS = ["github sponsors", "gitcoin grants", "drips network", "gitdrip"] as const;

const ROWS: Row[] = [
  {
    feature: "on-chain",
    gh: { text: "no", tone: "bad" },
    gc: { text: "ethereum", tone: "good" },
    drips: { text: "ethereum", tone: "good" },
    gitdrip: { text: "GenLayer Bradbury", tone: "good" },
  },
  {
    feature: "custodial",
    gh: { text: "yes (GitHub)", tone: "bad" },
    gc: { text: "no", tone: "good" },
    drips: { text: "no", tone: "good" },
    gitdrip: { text: "no", tone: "good" },
  },
  {
    feature: "continuous",
    gh: { text: "monthly", tone: "neutral" },
    gc: { text: "rounds", tone: "neutral" },
    drips: { text: "streams", tone: "good" },
    gitdrip: { text: "weekly or per-release", tone: "good" },
  },
  {
    feature: "auto-splits by contribution",
    gh: { text: "no", tone: "bad" },
    gc: { text: "no", tone: "bad" },
    drips: { text: "manual %", tone: "bad" },
    gitdrip: { text: "AI-scored", tone: "good" },
  },
  {
    feature: "filters bot commits",
    gh: { text: "n/a", tone: "neutral" },
    gc: { text: "n/a", tone: "neutral" },
    drips: { text: "no", tone: "bad" },
    gitdrip: { text: "score = 0", tone: "good" },
  },
  {
    feature: "filters whitespace spam",
    gh: { text: "n/a", tone: "neutral" },
    gc: { text: "n/a", tone: "neutral" },
    drips: { text: "no", tone: "bad" },
    gitdrip: { text: "score 1-5", tone: "good" },
  },
  {
    feature: "public scoring log",
    gh: { text: "n/a", tone: "neutral" },
    gc: { text: "n/a", tone: "neutral" },
    drips: { text: "n/a", tone: "neutral" },
    gitdrip: { text: "on-chain", tone: "good" },
  },
  {
    feature: "protocol fee",
    gh: { text: "cut", tone: "bad" },
    gc: { text: "round-based", tone: "neutral" },
    drips: { text: "0%", tone: "good" },
    gitdrip: { text: "0% (v1)", tone: "good" },
  },
];

export default function VsPage() {
  return (
    <>
      <SiteHeader />
      <main className="px-6 md:px-12 lg:px-20 py-16 md:py-24">
        <div className="max-w-6xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-(--accent-driprose) mb-4">
            comparison
          </p>
          <h1
            className="text-5xl sm:text-6xl md:text-7xl text-(--ink-display) tracking-tight leading-[0.95]"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            the split self-adjusts.
            <br />
            <span className="text-(--ink-muted)">that&apos;s the headline.</span>
          </h1>
          <p className="mt-6 text-lg text-(--ink-muted) max-w-[55ch]">
            everything else is table stakes. here&apos;s how GitDrip stacks up
            against existing OSS funding tools.
          </p>

          {/* DESKTOP TABLE — md and up */}
          <div className="hidden md:block mt-16 border border-(--rule) rounded-md overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-(--surface-card) border-b-2 border-(--rule-strong)">
                  <th className="text-left py-4 px-5 text-(--ink-muted) font-mono text-xs uppercase tracking-[0.14em]">
                    feature
                  </th>
                  {TOOLS.map((t) => (
                    <th
                      key={t}
                      className={`text-left py-4 px-5 font-mono text-xs uppercase tracking-[0.14em] ${
                        t === "gitdrip"
                          ? "text-(--accent-driprose) font-semibold"
                          : "text-(--ink-muted)"
                      }`}
                    >
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r, i) => (
                  <tr
                    key={r.feature}
                    className={`border-t border-(--rule) ${i % 2 === 0 ? "" : "bg-(--surface-sunken)"}`}
                  >
                    <td className="py-4 px-5 text-(--ink-body) font-medium">
                      {r.feature}
                    </td>
                    <DesktopCell cell={r.gh} />
                    <DesktopCell cell={r.gc} />
                    <DesktopCell cell={r.drips} />
                    <DesktopCell cell={r.gitdrip} highlight />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE STACK — below md */}
          <div className="md:hidden mt-12 space-y-6">
            {ROWS.map((r) => (
              <article
                key={r.feature}
                className="border border-(--rule) rounded-md overflow-hidden"
              >
                <header className="bg-(--surface-card) px-4 py-3 border-b border-(--rule)">
                  <p className="text-(--ink-display) font-medium">{r.feature}</p>
                </header>
                <dl className="divide-y divide-(--rule) text-sm">
                  <MobileRow label="github sponsors" cell={r.gh} />
                  <MobileRow label="gitcoin grants" cell={r.gc} />
                  <MobileRow label="drips network" cell={r.drips} />
                  <MobileRow label="gitdrip" cell={r.gitdrip} highlight />
                </dl>
              </article>
            ))}
          </div>

          {/* Why GenLayer */}
          <section className="mt-20 md:mt-28 max-w-[65ch]">
            <h2
              className="text-3xl md:text-4xl text-(--ink-display) tracking-tight mb-6"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              why GenLayer is required
            </h2>
            <p className="text-(--ink-body) leading-relaxed">
              Deterministic splits (X% to Alice, Y% to Bob) are what Drips
              Network already does. The unique angle: validators read each
              contributor&apos;s commit diffs during the period, score them
              with an LLM via the equivalence principle, and distribute the
              pool proportionally. This judgment is only possible with LLM
              consensus.
            </p>
            <p className="mt-4 text-(--ink-body) leading-relaxed">
              It also handles the messiness of real repos: squash-merges,
              force-pushes, co-authors, renamed accounts. Deterministic
              oracles fail on all of these. GitDrip is the first system where
              continuous, automatic, fair OSS sponsorship runs without humans
              in the loop.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function DesktopCell({ cell, highlight = false }: { cell: Cell; highlight?: boolean }) {
  return (
    <td className="py-4 px-5">
      <div className="inline-flex items-center gap-2">
        <ToneIcon tone={cell.tone} />
        <span
          className={
            highlight
              ? "text-(--ink-display) font-medium"
              : cell.tone === "good"
                ? "text-(--ink-body)"
                : "text-(--ink-muted)"
          }
        >
          {cell.text}
        </span>
      </div>
    </td>
  );
}

function MobileRow({
  label,
  cell,
  highlight = false,
}: {
  label: string;
  cell: Cell;
  highlight?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[10rem_1fr] items-center px-4 py-3 ${
        highlight ? "bg-(--accent-driprose-soft)" : ""
      }`}
    >
      <dt
        className={`font-mono text-xs uppercase tracking-[0.12em] ${
          highlight ? "text-(--accent-driprose) font-semibold" : "text-(--ink-muted)"
        }`}
      >
        {label}
      </dt>
      <dd className="inline-flex items-center gap-2">
        <ToneIcon tone={cell.tone} />
        <span
          className={
            highlight
              ? "text-(--ink-display) font-medium"
              : "text-(--ink-body)"
          }
        >
          {cell.text}
        </span>
      </dd>
    </div>
  );
}

function ToneIcon({ tone }: { tone: Cell["tone"] }) {
  if (tone === "good")
    return (
      <Check
        aria-hidden
        className="w-4 h-4 text-(--status-good) shrink-0"
      />
    );
  if (tone === "bad")
    return <X aria-hidden className="w-4 h-4 text-(--status-bad) shrink-0" />;
  return (
    <Minus aria-hidden className="w-4 h-4 text-(--ink-faint) shrink-0" />
  );
}
