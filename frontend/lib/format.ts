export const ATTOS_PER_GLT = 1_000_000_000_000_000_000n;

/** "0x3EBD…19E4" — fixed 6/4 truncation. Stable, scannable, copyable. */
export function shortAddress(addr: string): string {
  if (!addr) return "";
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}\u2026${addr.slice(-4)}`;
}

/** Format wei as "X.YYY GLT" with 4 fractional digits, tabular figures. */
export function formatGlt(wei: bigint, fractionDigits = 4): string {
  if (wei === 0n) return `0 GLT`;
  const negative = wei < 0n;
  const abs = negative ? -wei : wei;
  const whole = abs / ATTOS_PER_GLT;
  const remainder = abs % ATTOS_PER_GLT;
  const remStr = remainder.toString().padStart(18, "0").slice(0, fractionDigits);
  // Trim trailing zeros from fractional part to keep numbers honest.
  const trimmed = remStr.replace(/0+$/, "");
  const body = trimmed ? `${whole}.${trimmed}` : `${whole}`;
  return `${negative ? "-" : ""}${body} GLT`;
}

/** Parse "1.5" or "1500000000000000000" to wei (bigint). */
export function parseGlt(input: string): bigint {
  const s = input.trim();
  if (s === "") return 0n;
  if (!s.includes(".")) {
    return BigInt(s) * ATTOS_PER_GLT;
  }
  const [w, f = ""] = s.split(".");
  const fracPadded = (f + "0".repeat(18)).slice(0, 18);
  return BigInt(w || "0") * ATTOS_PER_GLT + BigInt(fracPadded || "0");
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
