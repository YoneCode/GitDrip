"use client";

import { useWallet } from "@/hooks/use-wallet";
import { Wallet, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Address } from "@/components/address";

export function WalletButton() {
  const { ready, authenticated, login, logout, address: addr } = useWallet();

  if (!ready) return null;

  if (!authenticated) {
    return (
      <Button
        onClick={login}
        size="sm"
        className="bg-(--accent-driprose) hover:bg-(--accent-driprose-hover) text-(--accent-on-driprose)"
      >
        <Wallet aria-hidden className="w-4 h-4 mr-1.5" />
        connect
      </Button>
    );
  }


  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <Wallet aria-hidden className="w-4 h-4 text-(--ink-muted)" />
      {addr ? <Address value={addr} /> : <span className="text-(--ink-muted)">no wallet</span>}
      <button
        onClick={logout}
        className="ml-1 p-1 rounded hover:bg-(--surface-sunken) focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="disconnect"
      >
        <LogOut aria-hidden className="w-3.5 h-3.5 text-(--ink-faint)" />
      </button>
    </span>
  );
}
