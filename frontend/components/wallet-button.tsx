"use client";

import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Address } from "@/components/address";
import { connectWallet } from "@/lib/genlayer";

export function WalletButton() {
  const [addr, setAddr] = useState<`0x${string}` | null>(null);
  const [pending, setPending] = useState(false);
  const [hasWallet, setHasWallet] = useState(() =>
    typeof window === "undefined" ? true : Boolean(window.ethereum),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const eth = window.ethereum;
    setHasWallet(Boolean(eth));
    if (!eth) return;
    // Try silent reconnect — non-disruptive, fires no UI prompts.
    eth
      .request({ method: "eth_accounts" })
      .then((accounts) => {
        const list = accounts as string[];
        if (list[0]) setAddr(list[0] as `0x${string}`);
      })
      .catch(() => {});
  }, []);

  if (!hasWallet) {
    return (
      <a
        href="https://metamask.io/download/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-(--ink-muted) hover:text-(--ink-body) underline underline-offset-2"
      >
        install metamask to interact
      </a>
    );
  }

  if (addr) {
    return (
      <span className="inline-flex items-center gap-2 text-sm">
        <Wallet aria-hidden className="w-4 h-4 text-(--ink-muted)" />
        <Address value={addr} />
      </span>
    );
  }

  const onClick = async () => {
    setPending(true);
    try {
      const a = await connectWallet();
      if (a) setAddr(a);
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      variant="default"
      size="sm"
      onClick={onClick}
      disabled={pending}
      className="bg-(--accent-driprose) hover:bg-(--accent-driprose-hover) text-(--accent-on-driprose)"
    >
      <Wallet aria-hidden className="w-4 h-4 mr-1.5" />
      {pending ? "connecting" : "connect wallet"}
    </Button>
  );
}
