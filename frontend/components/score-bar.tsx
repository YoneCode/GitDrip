export function ScoreBar({
  score,
  label,
}: {
  score: number;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return (
    <div
      className="flex items-center gap-3 w-full"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-label={label ?? `Score ${clamped} of 100`}
    >
      <div className="flex-1 h-2 bg-(--surface-sunken) overflow-hidden rounded-sm">
        <div
          className="h-full bg-(--accent-driprose) transition-[width] duration-300 ease-[var(--ease-out-expo)]"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="tabular-nums text-(--ink-body) text-sm w-12 text-right" title="score out of 100">
        {clamped}/100
      </span>
    </div>
  );
}
