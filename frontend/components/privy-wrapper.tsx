"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { WalletCtx } from "@/hooks/use-wallet";
import { usePrivyWallet } from "@/hooks/use-wallet-privy";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID!;

const bradburyChain = {
  id: 4221,
  name: "GenLayer Bradbury Testnet",
  network: "genlayer-bradbury",
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc-bradbury.genlayer.com"] },
  },
  blockExplorers: {
    default: {
      name: "Bradbury Explorer",
      url: "https://explorer-bradbury.genlayer.com",
    },
  },
};

function WalletBridge({ children }: { children: React.ReactNode }) {
  const state = usePrivyWallet();
  return <WalletCtx.Provider value={state}>{children}</WalletCtx.Provider>;
}

export function PrivyWrapper({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: { theme: "light", accentColor: "#3d8a83" },
        loginMethods: ["wallet", "email"],
        defaultChain: bradburyChain,
        supportedChains: [bradburyChain],
      }}
    >
      <WalletBridge>{children}</WalletBridge>
    </PrivyProvider>
  );
}
