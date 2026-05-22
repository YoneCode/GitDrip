import Link from "next/link";
import { WalletButton } from "@/components/wallet-button";

export function SiteHeader() {
  return (
    <header className="border-b border-(--rule)">
      <div className="mx-auto max-w-5xl px-6 py-5 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-baseline gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          <span className="font-display text-xl text-(--ink-display) font-semibold tracking-tight">
            GitDrip
          </span>
          <span className="text-xs text-(--ink-faint) tabular-nums">
            v1 · Bradbury testnet
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-(--ink-muted)">
          <Link
            href="/register"
            className="hover:text-(--ink-body) focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            register
          </Link>
          <Link
            href="/enroll"
            className="hover:text-(--ink-body) focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            enroll
          </Link>
          <Link
            href="/claim"
            className="hover:text-(--ink-body) focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            claim
          </Link>
          <Link
            href="/dashboard"
            className="hover:text-(--ink-body) focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            dashboard
          </Link>
          <WalletButton />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-(--rule)">
      <div className="mx-auto max-w-5xl px-6 py-8 flex flex-wrap items-baseline justify-between gap-4 text-sm text-(--ink-muted)">
        <span>
          deployed on{" "}
          <a
            className="hover:text-(--ink-body) underline underline-offset-2"
            href="https://explorer-bradbury.genlayer.com/contracts/0x725A57f7ED354eD124812DB9349483095dd38d99"
            target="_blank"
            rel="noopener noreferrer"
          >
            Bradbury testnet
          </a>
        </span>
        <span className="font-mono text-xs">
          0x725A57f7ED354eD124812DB9349483095dd38d99
        </span>
      </div>
    </footer>
  );
}
