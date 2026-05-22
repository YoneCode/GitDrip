"use client";

import { useEffect, useState } from "react";

/**
 * Returns `value` debounced by `delayMs`. New writes within the window
 * cancel pending updates so we never spam the network.
 */
export function useDebounced<T>(value: T, delayMs = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setV(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return v;
}
