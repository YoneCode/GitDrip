"use client";

/**
 * Per-wallet activity tracking, persisted in localStorage. The contract
 * doesn't expose "list repos a wallet has touched", and walking every
 * deposit on every page load would be wasteful. We persist a tiny index
 * each time the user successfully registers or enrolls, then use it to
 * render personalised "your repos" rails.
 *
 * This is purely a UX accelerator. Losing the cache only means the
 * personalised rail goes away until the user touches a repo again.
 */

const KEY = "gitdrip:profile:v1";

type Role = "maintainer" | "contributor";

export type ProfileEntry = {
  /** repo slug, lowercased */
  slug: string;
  role: Role;
  /** unix-ms when this was first added */
  ts: number;
};

type ProfileMap = Record<string, ProfileEntry[]>; // wallet (lower) -> entries

function load(): ProfileMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function save(map: ProfileMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // localStorage full / disabled — give up silently.
  }
}

export function recordRepoActivity(
  wallet: string,
  slug: string,
  role: Role,
): void {
  if (!wallet || !slug) return;
  const w = wallet.toLowerCase();
  const s = slug.toLowerCase();
  const map = load();
  const list = map[w] ?? [];
  const existing = list.find((e) => e.slug === s && e.role === role);
  if (existing) return;
  list.push({ slug: s, role, ts: Date.now() });
  // Keep sorted: newest first, dedup by (slug, role)
  list.sort((a, b) => b.ts - a.ts);
  map[w] = list;
  save(map);
}

export function getRepoActivity(wallet: string | null | undefined): ProfileEntry[] {
  if (!wallet) return [];
  const map = load();
  return map[wallet.toLowerCase()] ?? [];
}

export function listRoles(
  wallet: string | null | undefined,
  role: Role,
): string[] {
  return getRepoActivity(wallet ?? null)
    .filter((e) => e.role === role)
    .map((e) => e.slug);
}
