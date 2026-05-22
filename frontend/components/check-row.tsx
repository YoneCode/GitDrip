"use client";

import { AlertTriangle, Check, CircleAlert, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

export type CheckStatus = "idle" | "checking" | "pass" | "warn" | "fail";

/**
 * One inline pre-flight check row. Renders an icon + colour-coded text.
 * The `idle` variant is intentionally invisible so empty checks don't
 * clutter the page before the user has typed enough.
 */
export function CheckRow({
  status,
  children,
}: {
  status: CheckStatus;
  children: ReactNode;
}) {
  if (status === "idle") return null;

  const tone =
    status === "pass"
      ? "text-(--status-good)"
      : status === "fail"
        ? "text-(--status-bad)"
        : status === "warn"
          ? "text-(--status-warn)"
          : "text-(--ink-muted)";

  return (
    <p
      className={`flex items-start gap-2 text-sm ${tone}`}
      aria-live="polite"
    >
      <Icon status={status} />
      <span className="leading-snug">{children}</span>
    </p>
  );
}

function Icon({ status }: { status: CheckStatus }) {
  const cls = "w-4 h-4 shrink-0 mt-0.5";
  if (status === "checking")
    return <Loader2 aria-hidden className={`${cls} animate-spin`} />;
  if (status === "pass") return <Check aria-hidden className={cls} />;
  if (status === "warn") return <CircleAlert aria-hidden className={cls} />;
  if (status === "fail") return <AlertTriangle aria-hidden className={cls} />;
  return null;
}
