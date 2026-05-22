"use client";

import { createContext, useContext } from "react";

export type WalletState = {
  ready: boolean;
  authenticated: boolean;
  login: () => void;
  logout: () => void;
  address: `0x${string}` | undefined;
};

const DISCONNECTED: WalletState = {
  ready: false,
  authenticated: false,
  login: () => {},
  logout: () => {},
  address: undefined,
};

/**
 * Context populated by `<PrivyWalletProvider>` when Privy is active.
 * Falls back to DISCONNECTED when Privy is not configured.
 */
export const WalletCtx = createContext<WalletState>(DISCONNECTED);

export function useWallet(): WalletState {
  return useContext(WalletCtx);
}
