"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates a bigint from 0 to `target` over `durationMs`. Honors
 * prefers-reduced-motion (snaps directly to target).
 *
 * Returns the in-flight bigint. Re-runs whenever `target` changes.
 */
export function useCountUp(target: bigint, durationMs = 700): bigint {
  const [value, setValue] = useState<bigint>(0n);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const fromRef = useRef<bigint>(0n);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setValue(target);
      return;
    }

    fromRef.current = value;
    startTimeRef.current = null;
    const distance = target - fromRef.current;

    const ease = (t: number) => 1 - Math.pow(1 - t, 4); // ease-out-quart

    const tick = (now: number) => {
      if (startTimeRef.current === null) startTimeRef.current = now;
      const elapsed = now - startTimeRef.current;
      const t = Math.min(elapsed / durationMs, 1);
      const eased = ease(t);
      const current =
        fromRef.current + (distance * BigInt(Math.round(eased * 10000))) / 10000n;
      setValue(current);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return value;
}
