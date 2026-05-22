"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Calls `fn` immediately and every `intervalMs` thereafter. Pauses while
 * the tab is hidden (document.visibilityState !== 'visible'). Returns the
 * latest value `fn` resolved to, or `null` until the first response.
 */
export function usePoll<T>(
  fn: () => Promise<T>,
  intervalMs: number,
  deps: unknown[] = [],
): T | null {
  const [value, setValue] = useState<T | null>(null);
  const fnRef = useRef(fn);

  useEffect(() => {
    fnRef.current = fn;
    let cancelled = false;
    let timer: number | null = null;

    const tick = async () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const v = await fnRef.current();
        if (!cancelled) setValue(v);
      } catch { /* swallow polling errors */ }
    };

    tick();
    timer = window.setInterval(tick, intervalMs);
    const onVis = () => { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      if (timer !== null) window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps]);

  return value;
}
