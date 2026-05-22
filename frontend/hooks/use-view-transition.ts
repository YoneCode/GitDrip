"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * Returns a navigate fn that uses the View Transitions API when available,
 * falling back to a plain router.push.
 */
export function useViewTransition() {
  const router = useRouter();

  const navigate = useCallback(
    (href: string) => {
      const doc = typeof document !== "undefined" ? document : null;
      if (doc && "startViewTransition" in doc) {
        (doc as Document & { startViewTransition: (cb: () => void) => unknown }).startViewTransition(() => {
          router.push(href);
        });
      } else {
        router.push(href);
      }
    },
    [router],
  );

  return navigate;
}
