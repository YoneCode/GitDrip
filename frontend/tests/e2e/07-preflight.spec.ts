import { test, expect, type Page } from "@playwright/test";

async function waitForApp(page: Page) {
  await page
    .locator("h1, main input, header [aria-label*=\"menu\"]")
    .first()
    .waitFor({ state: "attached", timeout: 15_000 });
}

test("/register preflight: existing repo is flagged as already-registered", async ({
  page,
}) => {
  await page.goto("/register", { waitUntil: "domcontentloaded" });
  await waitForApp(page);

  await page.locator("#repo").fill("alnamodevloper/gitdrip-demo");

  // The on-chain check + raw fetch can take a few seconds against testnet.
  await expect(page.locator("body")).toContainText(/already registered/i, {
    timeout: 20_000,
  });
});

test("/register preflight: missing .gitdrip.json is flagged", async ({
  page,
}) => {
  await page.goto("/register", { waitUntil: "domcontentloaded" });
  await waitForApp(page);

  // Use a valid slug shape that almost certainly has no .gitdrip.json.
  await page.locator("#repo").fill("torvalds/linux");

  await expect(page.locator("body")).toContainText(
    /isn'?t on the default branch yet/i,
    { timeout: 15_000 },
  );
});

test("/enroll preflight: unregistered repo is flagged", async ({ page }) => {
  await page.goto("/enroll", { waitUntil: "domcontentloaded" });
  await waitForApp(page);

  await page.locator("#repo-slug").fill("torvalds/linux");

  await expect(page.locator("body")).toContainText(/isn.?t registered/i, {
    timeout: 15_000,
  });
});
