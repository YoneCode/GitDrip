import { ExternalLink } from "lucide-react";
import { explorerTx } from "@/lib/genlayer";
import { shortAddress } from "@/lib/format";

export function TxLink({
  hash,
  label,
  className = "",
}: {
  hash: string;
  label?: string;
  className?: string;
}) {
  return (
    <a
      href={explorerTx(hash)}
      target="_blank"
      rel="noopener noreferrer"
      className={
        `inline-flex items-center gap-1 font-mono text-[0.875em] ` +
        `text-(--accent-driprose) hover:text-(--accent-driprose-hover) ` +
        `underline underline-offset-2 decoration-(--accent-driprose-soft) ` +
        `hover:decoration-(--accent-driprose) ` +
        `focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded ${className}`
      }
    >
      {label ?? shortAddress(hash)}
      <ExternalLink aria-hidden className="w-3 h-3" />
    </a>
  );
}
