"use client";

import { Check } from "lucide-react";
import type { TxStatus } from "@/hooks/use-tx-status";

const LABEL: Record<TxStatus["stage"], string> = {
  submitting: "Submitting…",
  pending: "Validators voting",
  accepted: "Accepted on-chain",
  finalized: "Finalized",
  failed: "Failed",
};

export function TxStatusPill({ status }: { status: TxStatus | null }) {
  if (!status) return null;

  const total = status.validatorsTotal || 5;
  const dots = Array.from({ length: total }, (_, i) => i < status.validatorsAgreed);
  const isFinal = status.stage === "accepted" || status.stage === "finalized";
  const isFail = status.stage === "failed";

  return (
    <span
      className="inline-flex items-center gap-3 text-sm"
      aria-live="polite"
    >
      <span
        className={
          isFail
            ? "text-(--status-bad)"
            : isFinal
              ? "text-(--status-good)"
              : "text-(--ink-muted)"
        }
      >
        {LABEL[status.stage]}
      </span>
      <span className="inline-flex items-center gap-1.5">
        {dots.map((agreed, i) => (
          <span
            key={i}
            className={`vote-dot ${agreed ? "agreed" : ""}`}
            aria-label={agreed ? "validator agreed" : "validator pending"}
          />
        ))}
      </span>
      {isFinal && (
        <Check
          aria-hidden
          className="w-4 h-4 text-(--status-good)"
        />
      )}
    </span>
  );
}
