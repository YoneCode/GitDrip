import { test, expect, type Page } from "@playwright/test";

async function waitForApp(page: Page) {
  await page
    .locator("h1, main input, header [aria-label*=\"menu\"]")
    .first()
    .waitFor({ state: "attached", timeout: 15_000 });
}

/**
 * Rapid-navigation test: hit /dashboard/<slug> ten times in a row with
 * different slugs. With SWR's 30s dedupingInterval + localStorage cache
 * + the in-fetcher rate-limit backoff, the page should render every
 * time without blowing up. We allow gen_call rate-limit warnings in the
 * console (the helper's `logErrorOnce` may emit them) but the page
 * itself must never crash and must reach a final stable state.
 */
test("dashboard survives 10 rapid navigations without crashing", async ({
  page,
}) => {
  const slugs = [
    "alnamodevloper/gitdrip-demo",
    "torvalds/linux",
    "vercel/next.js",
    "facebook/react",
    "microsoft/typescript",
    "rust-lang/rust",
    "python/cpython",
    "golang/go",
    "nodejs/node",
    "alnamodevloper/gitdrip-demo", // back to the registered one
  ];

  let pageErrors = 0;
  page.on("pageerror", () => {
    pageErrors += 1;
  });

  for (const slug of slugs) {
    await page.goto(`/dashboard/${slug}`, { waitUntil: "domcontentloaded" });
    // Don't wait for full data — push to next slug ASAP to maximise pressure.
    await page
      .locator("h1, main input, header [aria-label*=\"menu\"]")
      .first()
      .waitFor({ state: "attached", timeout: 10_000 })
      .catch(() => {});
  }

  // After the rapid burst, settle on the last slug and verify it renders.
  await page.goto(`/dashboard/${slugs[slugs.length - 1]}`, {
    waitUntil: "domcontentloaded",
  });
  await waitForApp(page);

  // Either it shows the registered repo state OR the cache-served version.
  // Either way, no JS pageerror should have fired.
  expect(pageErrors).toBe(0);

  // Page should reach a stable terminal state — body has either
  // pool data (registered) or "Not Registered" (unregistered).
  await expect(page.locator("body")).toContainText(
    /(pool|not registered)/i,
    { timeout: 20_000 },
  );
});
