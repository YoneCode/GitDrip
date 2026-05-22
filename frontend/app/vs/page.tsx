import { SiteHeader, SiteFooter } from "@/components/site-chrome";

const rows: { feature: string; gh: string; gc: string; drips: string; gitdrip: string }[] = [
  { feature: "On-chain", gh: "no", gc: "yes (Ethereum)", drips: "yes (Ethereum)", gitdrip: "yes (GenLayer Bradbury)" },
  { feature: "Custodial", gh: "yes (GitHub)", gc: "no", drips: "no", gitdrip: "no" },
  { feature: "Continuous", gh: "monthly", gc: "rounds", drips: "streams", gitdrip: "weekly or per-release" },
  { feature: "Auto-splits by contribution", gh: "no", gc: "no", drips: "no (manual %)", gitdrip: "yes (AI-scored)" },
  { feature: "Filters bot commits", gh: "n/a", gc: "n/a", drips: "no", gitdrip: "yes (score = 0)" },
  { feature: "Filters whitespace spam", gh: "n/a", gc: "n/a", drips: "no", gitdrip: "yes (score 1-5)" },
  { feature: "Public scoring log", gh: "n/a", gc: "n/a", drips: "n/a", gitdrip: "yes (on-chain)" },
  { feature: "Protocol fee", gh: "cut", gc: "round-based", drips: "0%", gitdrip: "0% (v1)" },
];

export default function VsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-20">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-(--ink-faint) mb-3">
          comparison
        </p>
        <h1 className="font-display text-4xl text-(--ink-display) tracking-tight">
          GitDrip vs existing tools
        </h1>
        <p className="mt-3 text-(--ink-muted) max-w-[60ch]">
          The split self-adjusts to real contribution. That is the only
          feature that matters. Everything else is table stakes.
        </p>

        <div className="mt-12 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-(--rule-strong) text-left">
                <th className="py-3 pr-6 text-(--ink-muted) font-mono text-xs uppercase tracking-[0.14em]">
                  feature
                </th>
                <th className="py-3 px-4 text-(--ink-muted) font-mono text-xs uppercase tracking-[0.14em]">
                  github sponsors
                </th>
                <th className="py-3 px-4 text-(--ink-muted) font-mono text-xs uppercase tracking-[0.14em]">
                  gitcoin grants
                </th>
                <th className="py-3 px-4 text-(--ink-muted) font-mono text-xs uppercase tracking-[0.14em]">
                  drips network
                </th>
                <th className="py-3 px-4 text-(--accent-driprose) font-mono text-xs uppercase tracking-[0.14em] font-semibold">
                  gitdrip
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--rule)">
              {rows.map((r) => (
                <tr key={r.feature}>
                  <td className="py-3 pr-6 text-(--ink-body)">
                    {r.feature}
                  </td>
                  <td className="py-3 px-4 text-(--ink-muted)">{r.gh}</td>
                  <td className="py-3 px-4 text-(--ink-muted)">{r.gc}</td>
                  <td className="py-3 px-4 text-(--ink-muted)">{r.drips}</td>
                  <td className="py-3 px-4 text-(--ink-display) font-medium">
                    {r.gitdrip}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="mt-16 max-w-[60ch]">
          <h2 className="font-display text-2xl text-(--ink-display) mb-4">
            Why GenLayer is required
          </h2>
          <p className="text-(--ink-body) leading-relaxed">
            Deterministic split (X% to Alice, Y% to Bob) is what Drips Network
            already does. The unique angle: validators read each
            contributor&apos;s commit diffs during the period, score them with
            an LLM via the equivalence principle, and distribute the pool
            proportionally. This judgment is only possible with LLM consensus.
          </p>
          <p className="mt-4 text-(--ink-body) leading-relaxed">
            It also handles real-world messiness: squash-merges, force-pushes,
            co-authors, renamed accounts. Deterministic oracles fail on all of
            these. GitDrip is the first system where continuous, automatic,
            fair OSS sponsorship runs without humans in the loop.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
