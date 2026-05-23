"use client";

import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

export const CONTRACT_ADDRESS =
  "0xEb7370b0df3e3d5eCAf9846048693598362D6CE8" as const;

export const EXPLORER = "https://explorer-bradbury.genlayer.com";

export const CHAIN = testnetBradbury;

let _client: ReturnType<typeof createClient> | null = null;

/** Public client for read calls (no wallet needed). */
export function client() {
  if (_client) return _client;
  _client = createClient({ chain: testnetBradbury });
  return _client;
}

export function explorerTx(hash: string) {
  return `${EXPLORER}/tx/${hash}`;
}

export function explorerContract(address: string = CONTRACT_ADDRESS) {
  return `${EXPLORER}/address/${address}`;
}
