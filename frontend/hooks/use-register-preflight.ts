"use client";

import { useEffect, useState } from "react";
import { getRepo, type RepoRecord } from "@/lib/contract";
import { useDebounced } from "./use-debounced";

/**
 * Combined pre-flight for `/register`. For a given slug + connected wallet,
 * tells the user whether:
 *  - the slug is already registered on-chain (and to which wallet);
 *  - .gitdrip.json is fetchable on the default branch;
 *  - the wallet inside that file matches the one they're connected as.
 *
 * All checks run in parallel and are debounced. Safe to call before the
 * user has a wallet — the proof check still runs, and the match check
 * shows "connect wallet to verify match".
 */

type ProofState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "missing" }
  | { kind: "malformed"; raw: string }
  | { kind: "found"; walletInFile: string; matches: boolean | null };

type ChainState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "unregistered" }
  | { kind: "registered"; record: RepoRecord; mine: boolean };

export type RegisterPreflight = {
  slug: string;
  proof: ProofState;
  chain: ChainState;
};

function normalizeSlug(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/\/$/, "");
}

function isValidSlug(s: string): boolean {
  return /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(s);
}

export function useRegisterPreflight(
  rawSlug: string,
  walletLower: string | null,
): RegisterPreflight {
  const slug = normalizeSlug(rawSlug);
  const debounced = useDebounced(slug, 350);

  const [proof, setProof] = useState<ProofState>({ kind: "idle" });
  const [chain, setChain] = useState<ChainState>({ kind: "idle" });

  // ---- proof file (raw.githubusercontent.com) ----------------------------
  useEffect(() => {
    if (!debounced || !isValidSlug(debounced)) {
      setProof({ kind: "idle" });
      return;
    }
    let cancelled = false;
    setProof({ kind: "checking" });

    const url = `https://raw.githubusercontent.com/${debounced}/HEAD/.gitdrip.json`;
    fetch(url, { cache: "no-store" })
      .then(async (r) => {
        if (cancelled) return;
        if (r.status === 404) {
          setProof({ kind: "missing" });
          return;
        }
        if (!r.ok) {
          setProof({ kind: "missing" });
          return;
        }
        const text = await r.text();
        try {
          const parsed = JSON.parse(text);
          const wallet = String(parsed?.maintainer_wallet ?? "").toLowerCase();
          if (!wallet) {
            setProof({ kind: "malformed", raw: text.slice(0, 200) });
            return;
          }
          const matches = walletLower ? wallet === walletLower : null;
          setProof({ kind: "found", walletInFile: wallet, matches });
        } catch {
          setProof({ kind: "malformed", raw: text.slice(0, 200) });
        }
      })
      .catch(() => {
        if (!cancelled) setProof({ kind: "missing" });
      });

    return () => {
      cancelled = true;
    };
  }, [debounced, walletLower]);

  // ---- on-chain getRepo ---------------------------------------------------
  useEffect(() => {
    if (!debounced || !isValidSlug(debounced)) {
      setChain({ kind: "idle" });
      return;
    }
    let cancelled = false;
    setChain({ kind: "checking" });

    getRepo(debounced)
      .then((rec) => {
        if (cancelled) return;
        if (!rec) {
          setChain({ kind: "unregistered" });
          return;
        }
        const mine =
          !!walletLower && rec.maintainer.toLowerCase() === walletLower;
        setChain({ kind: "registered", record: rec, mine });
      })
      .catch(() => {
        if (!cancelled) setChain({ kind: "unregistered" });
      });

    return () => {
      cancelled = true;
    };
  }, [debounced, walletLower]);

  return { slug: debounced, proof, chain };
}
