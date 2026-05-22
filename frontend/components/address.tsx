"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { shortAddress } from "@/lib/format";

export function Address({
  value,
  className = "",
}: {
  value: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  if (!value) return <span className="text-(--ink-faint) font-mono">—</span>;

  const onCopy = () => {
    if (typeof navigator === "undefined") return;
    void navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      title={copied ? "copied" : value}
      aria-label={`Copy address ${value}`}
      className={
        `group inline-flex items-center gap-1.5 font-mono text-[0.875em] ` +
        `text-(--ink-body) hover:text-(--ink-display) transition-colors ` +
        `focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ` +
        `rounded px-1 -mx-1 ` +
        className
      }
    >
      <span>{shortAddress(value)}</span>
      {copied ? (
        <Check
          aria-hidden
          className="w-3.5 h-3.5 text-(--status-good)"
        />
      ) : (
        <Copy
          aria-hidden
          className="w-3.5 h-3.5 text-(--ink-faint) opacity-0 group-hover:opacity-100 transition-opacity"
        />
      )}
    </button>
  );
}
