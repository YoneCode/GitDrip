"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { WalletButton } from "@/components/wallet-button";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-(--rule)">
      <div className="px-6 md:px-12 lg:px-20 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-baseline gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          <span className="font-display text-2xl text-(--ink-display) font-semibold tracking-tight">
            GitDrip
          </span>
          <span className="text-xs text-(--accent-driprose) font-mono border border-(--accent-driprose-soft) px-1.5 py-0.5 rounded-sm">
            testnet
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-(--ink-muted)">
          <NavLinks />
          <WalletButton />
        </nav>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 -mr-2 text-(--ink-muted) hover:text-(--ink-body) focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          aria-label={open ? "close menu" : "open menu"}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <nav className="md:hidden border-t border-(--rule) px-6 py-4 flex flex-col gap-3 text-sm text-(--ink-muted)">
          <NavLinks onClick={() => setOpen(false)} />
          <div className="pt-2 border-t border-(--rule)">
            <WalletButton />
          </div>
        </nav>
      )}
    </header>
  );
}

function NavLinks({ onClick }: { onClick?: () => void }) {
  const links = [
    { href: "/", label: "home" },
    { href: "/vs", label: "compare" },
    { href: "/register", label: "register" },
    { href: "/enroll", label: "enroll" },
    { href: "/claim", label: "claim" },
    { href: "/dashboard", label: "dashboard" },
  ];
  return (
    <>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          onClick={onClick}
          className="hover:text-(--ink-body) focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded py-1"
        >
          {l.label}
        </Link>
      ))}
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-(--rule)">
      <div className="px-6 md:px-12 lg:px-20 py-8 flex flex-wrap items-center justify-between gap-4 text-sm text-(--ink-muted)">
        <span>
          deployed on{" "}
          <a
            className="text-(--accent-driprose) hover:text-(--accent-driprose-hover) underline underline-offset-2"
            href="https://explorer-bradbury.genlayer.com/contracts/0xEb7370b0df3e3d5eCAf9846048693598362D6CE8"
            target="_blank"
            rel="noopener noreferrer"
          >
            Bradbury testnet
          </a>
        </span>
        <CopyAddress />
      </div>
    </footer>
  );
}

function CopyAddress() {
  const addr = "0xEb7370b0df3e3d5eCAf9846048693598362D6CE8";
  const [copied, setCopied] = useState(false);
  const onClick = () => {
    void navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <button
      onClick={onClick}
      className="font-mono text-xs text-(--ink-faint) hover:text-(--ink-body) transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
      aria-label="copy contract address"
    >
      {copied ? "copied" : "0x725A…8d99"}
    </button>
  );
}
