"use client";

import { useEffect, useState } from "react";
import { getRepo, getRoster, type RepoRecord } from "@/lib/contract";
import { useDebounced } from "./use-debounced";

/**
 * Pre-flight for `/enroll`. Checks:
 *  - the repo slug is registered on-chain
 *  - the user isn't already enrolled in that repo
 *  - the gist exists, is public, owned by the claimed login, and contains
 *    the expected proof body (`gitdrip:<slug>:<wallet>`)
 */

type RepoState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "unregistered" }
  | {
      kind: "registered";
      record: RepoRecord;
      alreadyEnrolled: boolean;
      enrolledLogin: string | null;
    };

type GistState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "missing" }
  | { kind: "private" }
  | { kind: "wrong_owner"; actualOwner: string }
  | { kind: "missing_body"; expected: string }
  | { kind: "found"; owner: string; matches: boolean };

export type EnrollPreflight = {
  slug: string;
  repo: RepoState;
  gist: GistState;
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

function isLikelyGistId(s: string): boolean {
  // GitHub gist IDs are 20-32 hex chars in practice.
  return /^[0-9a-fA-F]{8,}$/.test(s);
}

export function useEnrollPreflight(
  rawSlug: string,
  rawLogin: string,
  rawGistId: string,
  walletLower: string | null,
): EnrollPreflight {
  const slug = normalizeSlug(rawSlug);
  const login = rawLogin.trim().toLowerCase();
  const gistId = rawGistId.trim();

  const dSlug = useDebounced(slug, 350);
  const dLogin = useDebounced(login, 350);
  const dGistId = useDebounced(gistId, 350);

  const [repo, setRepo] = useState<RepoState>({ kind: "idle" });
  const [gist, setGist] = useState<GistState>({ kind: "idle" });

  // ---- on-chain repo + roster --------------------------------------------
  useEffect(() => {
    if (!dSlug || !isValidSlug(dSlug)) {
      setRepo({ kind: "idle" });
      return;
    }
    let cancelled = false;
    setRepo({ kind: "checking" });

    Promise.all([getRepo(dSlug), getRoster(dSlug)])
      .then(([rec, roster]) => {
        if (cancelled) return;
        if (!rec) {
          setRepo({ kind: "unregistered" });
          return;
        }
        let alreadyEnrolled = false;
        let enrolledLogin: string | null = null;
        if (walletLower) {
          for (const [l, w] of Object.entries(roster)) {
            if (w.toLowerCase() === walletLower) {
              alreadyEnrolled = true;
              enrolledLogin = l;
              break;
            }
          }
        }
        setRepo({
          kind: "registered",
          record: rec,
          alreadyEnrolled,
          enrolledLogin,
        });
      })
      .catch(() => {
        if (!cancelled) setRepo({ kind: "unregistered" });
      });

    return () => {
      cancelled = true;
    };
  }, [dSlug, walletLower]);

  // ---- gist proof ---------------------------------------------------------
  useEffect(() => {
    if (!dGistId || !isLikelyGistId(dGistId)) {
      setGist({ kind: "idle" });
      return;
    }
    let cancelled = false;
    setGist({ kind: "checking" });

    fetch(`https://api.github.com/gists/${dGistId}`, { cache: "no-store" })
      .then(async (r) => {
        if (cancelled) return;
        if (r.status === 404) {
          setGist({ kind: "missing" });
          return;
        }
        if (r.status === 403) {
          // rate-limited or private — treat as "can't verify yet"
          setGist({ kind: "private" });
          return;
        }
        if (!r.ok) {
          setGist({ kind: "missing" });
          return;
        }
        const data = await r.json();
        const owner = String(data?.owner?.login ?? "").toLowerCase();
        const isPublic = data?.public === true;
        if (!isPublic) {
          setGist({ kind: "private" });
          return;
        }
        if (dLogin && owner && owner !== dLogin) {
          setGist({ kind: "wrong_owner", actualOwner: owner });
          return;
        }
        const wallet = walletLower ?? "<your-wallet>";
        const expected = `gitdrip:${dSlug}:${wallet}`;
        const files = data?.files ?? {};
        let matches = false;
        for (const f of Object.values(files) as { content?: string }[]) {
          if ((f?.content ?? "").includes(expected)) {
            matches = true;
            break;
          }
        }
        if (!matches) {
          setGist({ kind: "missing_body", expected });
          return;
        }
        setGist({ kind: "found", owner, matches });
      })
      .catch(() => {
        if (!cancelled) setGist({ kind: "missing" });
      });

    return () => {
      cancelled = true;
    };
  }, [dGistId, dLogin, dSlug, walletLower]);

  return { slug: dSlug, repo, gist };
}
