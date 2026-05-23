"use client";

import { useEffect, useState } from "react";
import { CircleAlert, X } from "lucide-react";
import { subscribeRateLimitToast } from "@/lib/rate-limit";

/**
 * Single, page-mounted toast that fires when the rate-limit fetcher
 * exhausts its retries. Auto-dismisses after 8s; user can dismiss
 * manually. No prop drilling — pages mount this and it self-wires.
 */
export function RateLimitToast() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const unsub = subscribeRateLimitToast(() => {
      setVisible(true);
      const t = window.setTimeout(() => setVisible(false), 8_000);
      return () => window.clearTimeout(t);
    });
    return () => {
      unsub();
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)] flex items-start gap-3 rounded-md border border-(--rule-strong) bg-(--surface-card) px-4 py-3 shadow-lg animate-fade-rise"
    >
      <CircleAlert
        aria-hidden
        className="w-4 h-4 text-(--status-warn) shrink-0 mt-0.5"
      />
      <p className="text-sm text-(--ink-body) leading-snug flex-1">
        Bradbury RPC is busy. Click{" "}
        <span className="text-(--ink-display) font-medium">Refresh</span> to
        try again.
      </p>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="text-(--ink-faint) hover:text-(--ink-body) transition-colors shrink-0"
        aria-label="dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
