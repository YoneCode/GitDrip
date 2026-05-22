"use client";

import dynamic from "next/dynamic";
import { WalletCtx } from "@/hooks/use-wallet";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
const PRIVY_ENABLED =
  PRIVY_APP_ID.length > 10 && !PRIVY_APP_ID.includes("REPLACE");

// Only load Privy code when the app ID is valid.
const PrivyProviderWrapper = dynamic(
  () => import("./privy-wrapper").then((m) => m.PrivyWrapper),
  { ssr: false },
);

export function Providers({ children }: { children: React.ReactNode }) {
  if (!PRIVY_ENABLED) {
    return <>{children}</>;
  }

  return <PrivyProviderWrapper>{children}</PrivyProviderWrapper>;
}
