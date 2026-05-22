"use client";

import { useEffect, useState } from "react";

/**
 * Reveal `target` text one character at a time over `durationMs`.
 * Honors prefers-reduced-motion (snaps to full text immediately).
 */
export function useTypewriter(target: string, durationMs = 600): string {
  const [out, setOut] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      setOut(target);
      return;
    }
    const reduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || target.length === 0) {
      setOut(target);
      return;
    }
    setOut("");
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      const chars = Math.round(t * target.length);
      setOut(target.slice(0, chars));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return out;
}
