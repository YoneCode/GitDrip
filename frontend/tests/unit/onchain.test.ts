import { describe, it, expect } from "vitest";
import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const CONTRACT = "0x725A57f7ED354eD124812DB9349483095dd38d99" as `0x${string}`;
const client = createClient({ chain: testnetBradbury });

describe("Bradbury on-chain reads (real RPC, no mocks)", () => {
  it("next_deposit returns a non-negative integer", { timeout: 20_000 }, async () => {
    const v = await client.readContract({
      address: CONTRACT,
      functionName: "next_deposit",
      args: [],
    });
    const n = typeof v === "bigint" ? Number(v) : Number(v);
    expect(Number.isFinite(n)).toBe(true);
    expect(n).toBeGreaterThanOrEqual(0);
    console.log("→ next_deposit =", v);
  });

  it("get_repo returns empty string for unregistered slug", { timeout: 20_000 }, async () => {
    const v = await client.readContract({
      address: CONTRACT,
      functionName: "get_repo",
      args: ["this-org-does-not-exist/this-repo-does-not-exist"],
    });
    expect(v).toBe("");
  });

  it("get_pending returns '0' for a fresh address", { timeout: 20_000 }, async () => {
    const v = await client.readContract({
      address: CONTRACT,
      functionName: "get_pending",
      args: ["0x0000000000000000000000000000000000000001"],
    });
    expect(v).toBe("0");
  });

  it("get_roster returns '{}' for unregistered slug", { timeout: 20_000 }, async () => {
    const v = await client.readContract({
      address: CONTRACT,
      functionName: "get_roster",
      args: ["nope/nope"],
    });
    expect(v === "{}" || v === "").toBe(true);
  });

  it("get_score_log returns empty for unregistered slug + index", { timeout: 20_000 }, async () => {
    const v = await client.readContract({
      address: CONTRACT,
      functionName: "get_score_log",
      args: ["nope/nope", 1],
    });
    expect(v).toBe("");
  });
});
