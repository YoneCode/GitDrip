export const ATTOS_PER_GEN = 1_000_000_000_000_000_000n;

/** Minimum sponsor deposit enforced by the contract: 10 GEN. */
export const MIN_SPONSOR_WEI = 10n * ATTOS_PER_GEN;

/** "0x3EBD…19E4" — fixed 6/4 truncation. Stable, scannable, copyable. */
export function shortAddress(addr: string): string {
  if (!addr) return "";
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}\u2026${addr.slice(-4)}`;
}

/** Format wei as "X.YYY GEN" with 4 fractional digits, tabular figures. */
export function formatGen(wei: bigint, fractionDigits = 4): string {
  if (wei === 0n) return `0 GEN`;
  const negative = wei < 0n;
  const abs = negative ? -wei : wei;
  const whole = abs / ATTOS_PER_GEN;
  const remainder = abs % ATTOS_PER_GEN;
  const remStr = remainder.toString().padStart(18, "0").slice(0, fractionDigits);
  // Trim trailing zeros from fractional part to keep numbers honest.
  const trimmed = remStr.replace(/0+$/, "");
  const body = trimmed ? `${whole}.${trimmed}` : `${whole}`;
  return `${negative ? "-" : ""}${body} GEN`;
}

/** Parse "1.5" or "1500000000000000000" to wei (bigint). */
export function parseGen(input: string): bigint {
  const s = input.trim();
  if (s === "") return 0n;
  if (!s.includes(".")) {
    return BigInt(s) * ATTOS_PER_GEN;
  }
  const [w, f = ""] = s.split(".");
  const fracPadded = (f + "0".repeat(18)).slice(0, 18);
  return BigInt(w || "0") * ATTOS_PER_GEN + BigInt(fracPadded || "0");
}

/** ISO timestamp -> "23 May 2026" (locale-stable, no time-of-day). */
export function formatDate(unix: number | undefined): string {
  if (!unix) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(unix * 1000));
}

/** Days between two unix timestamps. Negative if past. */
export function daysBetween(now: number, future: number): number {
  return Math.round((future - now) / 86400);
}
