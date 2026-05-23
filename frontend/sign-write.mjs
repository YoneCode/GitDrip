#!/usr/bin/env node
// Test helper: signs and submits a contract write with optional native value.
// Usage:
//   node scripts/sign-write.mjs <method> <args-json-array> [value-in-gen]
// Reads ACCOUNT_PRIVATE_KEY_1 from .env. Never prints the key.

import dotenv from "dotenv";
dotenv.config({ path: new URL("../.env", import.meta.url) });
import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { privateKeyToAccount } from "viem/accounts";

const CONTRACT = "0xEb7370b0df3e3d5eCAf9846048693598362D6CE8";
const ATTOS = 1_000_000_000_000_000_000n;

const [, , method, argsJson, valueGen = "0"] = process.argv;
if (!method || !argsJson) {
  console.error("usage: sign-write.mjs <method> <args-json> [value-in-gen]");
  process.exit(1);
}

const pkRaw = process.env.ACCOUNT_PRIVATE_KEY_1;
if (!pkRaw) { console.error("ACCOUNT_PRIVATE_KEY_1 missing in .env"); process.exit(1); }
const pk = (pkRaw.startsWith("0x") ? pkRaw : `0x${pkRaw}`);

const account = privateKeyToAccount(pk);
const client = createClient({ chain: testnetBradbury });

const args = JSON.parse(argsJson);
const value = BigInt(Math.round(parseFloat(valueGen) * 1e18)); // gen -> wei

console.log(`from: ${account.address}`);
console.log(`method: ${method}`);
console.log(`args: ${JSON.stringify(args)}`);
console.log(`value: ${valueGen} GEN (${value} wei)`);

try {
  const tx = await client.writeContract({
    account,
    address: CONTRACT,
    functionName: method,
    args,
    value,
  });
  console.log("tx:", tx);

  // Poll receipt
  const hash = typeof tx === "string" ? tx : (tx?.hash ?? tx?.transactionHash);
  if (!hash) { console.log("no hash returned, exiting"); process.exit(0); }

  console.log("waiting for receipt...");
  for (let i = 0; i < 24; i++) {
    try {
      const r = await client.getTransaction({ hash });
      const lastRound = r?.consensus_data?.leader_receipt?.[0] ?? r?.lastRound;
      const votes = lastRound?.validatorVotesName ?? [];
      const status = (r?.status_name ?? r?.status ?? "PENDING").toString();
      console.log(`  [${i}] status=${status} votes=${votes.join(",")}`);
      if (/ACCEPTED|FINALIZED|UNDETERMINED|FAILED|TIMEOUT/i.test(status)) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 5000));
  }
} catch (e) {
  console.error("write failed:", e.message ?? e);
  process.exit(1);
}
