"use client";

import { formatGlt } from "@/lib/format";

export function WeiAmount({
  value,
  fractionDigits = 4,
  className = "",
}: {
  value: bigint;
  fractionDigits?: number;
  className?: string;
}) {
  const text = formatGlt(value, fractionDigits);
  return (
    <span
      className={`tabular-nums ${className}`}
      title={`${value.toString()} attoGLT`}
    >
      {text}
    </span>
  );
}
