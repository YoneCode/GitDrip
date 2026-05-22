"use client";

import { useEffect, useState } from "react";
import { client } from "@/lib/genlayer";

export type TxStage = "submitting" | "pending" | "accepted" | "finalized" | "failed";

export type TxStatus = {
  stage: TxStage;
  validatorsAgreed: number;
  validatorsTotal: number;
};

const PENDING: TxStatus = {
  stage: "pending",
  validatorsAgreed: 0,
  validatorsTotal: 5,
};

/**
 * Polls a Bradbury tx hash and reports stage + how many validators have
 * agreed. Stops polling once finalized or failed. Pauses when tab hidden.
 */
export function useTxStatus(hash: string | null, intervalMs = 3000): TxStatus | null {
  const [status, setStatus] = useState<TxStatus | null>(null);

  useEffect(() => {
    if (!hash) { setStatus(null); return; }

    let cancelled = false;
    setStatus({ ...PENDING });

    const poll = async () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const tx = (await client().getTransaction({
          hash: hash as unknown as Parameters<ReturnType<typeof client>["getTransaction"]>[0]["hash"],
        })) as unknown as {
          lastRound?: { validatorVotesName?: string[]; roundValidators?: unknown[] };
          consensus_data?: { leader_receipt?: Array<{ validatorVotesName?: string[]; roundValidators?: unknown[] }> };
          status_name?: string;
          status?: string;
        };
        if (cancelled) return;

        const lastRound = tx?.consensus_data?.leader_receipt?.[0]
          ?? tx?.lastRound
          ?? null;

        const votes: string[] = (lastRound?.validatorVotesName ?? []) as string[];
        const agreed = votes.filter((v) => v === "AGREE").length;
        const total = Math.max(votes.length, lastRound?.roundValidators?.length ?? 5);

        const statusName = (tx?.status_name ?? tx?.status ?? "").toString().toUpperCase();
        let stage: TxStage = "pending";
        if (statusName.includes("FINALIZED")) stage = "finalized";
        else if (statusName.includes("ACCEPTED")) stage = "accepted";
        else if (statusName.includes("UNDETERMINED") || statusName.includes("FAILED")) stage = "failed";

        setStatus({ stage, validatorsAgreed: agreed, validatorsTotal: total });
      } catch {
        // tx not yet indexed
      }
    };

    poll();
    const id = window.setInterval(poll, intervalMs);
    const onVis = () => { if (!document.hidden) poll(); };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [hash, intervalMs]);

  return status;
}
