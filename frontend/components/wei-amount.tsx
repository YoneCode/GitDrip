"use client";

import { formatGen } from "@/lib/format";

export function WeiAmount({
  value,
  fractionDigits = 4,
  className = "",
}: {
  value: bigint;
  fractionDigits?: number;
  className?: string;
}) {
  const text = formatGen(value, fractionDigits);
  return (
    <span
      className={`tabular-nums ${className}`}
      title={`${value.toString()} attoGEN`}
    >
      {text}
    </span>
  );
}
