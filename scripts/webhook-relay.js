import crypto from "crypto";
import express from "express";
import dotenv from "dotenv";
import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { privateKeyToAccount } from "viem/accounts";

dotenv.config({ path: "../.env" });

const { WEBHOOK_SECRET, ACCOUNT_PRIVATE_KEY_1 } = process.env;
if (!WEBHOOK_SECRET || !ACCOUNT_PRIVATE_KEY_1) {
  console.error("Missing WEBHOOK_SECRET or ACCOUNT_PRIVATE_KEY_1 in .env");
  process.exit(1);
}

const CONTRACT_ADDRESS = "0x725A57f7ED354eD124812DB9349483095dd38d99";
const account = privateKeyToAccount(ACCOUNT_PRIVATE_KEY_1);
const client = createClient({ chain: testnetBradbury });

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

const app = express();
app.use(express.raw({ type: "application/json" }));

app.post("/release", async (req, res) => {
  const sig = req.headers["x-hub-signature-256"];
  if (!sig) return res.status(401).json({ error: "missing signature" });

  const hmac = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(req.body)
    .digest("hex");
  const expected = Buffer.from(`sha256=${hmac}`, "utf8");
  const received = Buffer.from(sig, "utf8");

  if (
    expected.length !== received.length ||
    !crypto.timingSafeEqual(expected, received)
  ) {
    log("invalid signature");
    return res.status(403).json({ error: "invalid signature" });
  }

  let payload;
  try {
    payload = JSON.parse(req.body);
  } catch {
    return res.status(400).json({ error: "invalid JSON" });
  }

  const repoSlug = payload?.repository?.full_name;
  const tag = payload?.release?.tag_name;
  if (!repoSlug || !tag) {
    return res.status(400).json({ error: "missing repo or tag" });
  }

  log(`release: ${repoSlug} @ ${tag}`);

  try {
    const txHash = await client.writeContract({
      account,
      address: CONTRACT_ADDRESS,
      functionName: "distribute_on_release",
      args: [repoSlug, tag],
      value: 0n,
    });
    log(`tx submitted: ${txHash}`);
    return res.status(200).json({ ok: true, tx: txHash });
  } catch (err) {
    log(`contract error: ${err.message ?? err}`);
    return res.status(500).json({ error: String(err.message ?? err) });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true }));

const PORT = parseInt(process.env.PORT || "4100", 10);
app.listen(PORT, () => log(`listening on :${PORT}`));
