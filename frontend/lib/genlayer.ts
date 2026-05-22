"use client";

import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import type { GenLayerClient } from "genlayer-js/types";

export const CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` | undefined) ??
  ("0x725A57f7ED354eD124812DB9349483095dd38d99" as const);

export const EXPLORER =
  "https://explorer-bradbury.genlayer.com";

export const RPC_URL = "https://rpc-bradbury.genlayer.com";

export const CHAIN = testnetBradbury;

let _client: GenLayerClient<typeof testnetBradbury> | null = null;

/** Public client for read calls. Singleton per browser session. */
export function client(): GenLayerClient<typeof testnetBradbury> {
  if (_client) return _client;
  _client = createClient({ chain: testnetBradbury });
  return _client;
}

/** Trigger MetaMask flow, return the connected address. */
export async function connectWallet(): Promise<`0x${string}` | null> {
  if (typeof window === "undefined" || !window.ethereum) return null;
  await client().connect("testnetBradbury");
  const accounts = (await window.ethereum.request({
    method: "eth_requestAccounts",
  })) as string[];
  return (accounts[0] as `0x${string}`) ?? null;
}

export function explorerTx(hash: string) {
  return `${EXPLORER}/tx/${hash}`;
}
export function explorerContract(address: string = CONTRACT_ADDRESS) {
  return `${EXPLORER}/contracts/${address}`;
}
