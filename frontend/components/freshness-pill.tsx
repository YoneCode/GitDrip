"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

/**
 * Tiny "last updated 12s ago — refresh" pill. When `cachedAt` is set,
 * shows relative age. Clicking the refresh icon calls `onRefresh`. While
 * `isValidating` is true the icon spins and the button is disabled to
 * stop spam clicks.
 */
export function FreshnessPill({
  cachedAt,
  onRefresh,
  isValidating = false,
  className = "",
}: {
  cachedAt: number | undefined;
  onRefresh: () => void;
  isValidating?: boolean;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  // Tick every 5s only to update the relative time text. This is
  // pure DOM, not a network call.
  useEffect(() => {
    if (!cachedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 5_000);
    return () => window.clearInterval(id);
  }, [cachedAt]);

  const ago = cachedAt ? formatAgo(now - cachedAt) : null;

  return (
    <div
      className={`inline-flex items-center gap-2 text-xs text-(--ink-faint) ${className}`}
    >
      {ago ? (
        <span>last updated {ago}</span>
      ) : (
        <span>not yet loaded</span>
      )}
      <span aria-hidden>·</span>
      <button
        type="button"
        onClick={onRefresh}
        disabled={isValidating}
        className="inline-flex items-center gap-1 hover:text-(--accent-driprose) disabled:opacity-50 disabled:cursor-wait transition-colors focus:outline-none focus-visible:text-(--accent-driprose)"
        aria-label="refresh now"
      >
        <RefreshCw
          aria-hidden
          className={`w-3 h-3 ${isValidating ? "animate-spin" : ""}`}
        />
        refresh
      </button>
    </div>
  );
}

function formatAgo(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}
