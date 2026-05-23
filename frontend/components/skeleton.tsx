export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-(--surface-card) rounded-sm ${className}`}
      aria-hidden
    />
  );
}

export function TextSkeleton({ lines = 1, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} role="status" aria-label="loading">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i === lines - 1 ? "w-3/4" : "w-full"}`} />
      ))}
    </div>
  );
}
