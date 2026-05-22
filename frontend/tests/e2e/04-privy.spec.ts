import { test, expect, type Page } from "@playwright/test";

async function waitForApp(page: Page) {
  await page
    .locator('h1, main input, header [aria-label*="menu"]')
    .first()
    .waitFor({ state: "attached", timeout: 15_000 });
}

test("connect button opens a Privy auth surface", async ({ page }) => {
  // /claim is reliable: not authenticated → big "Connect Wallet" button visible
  await page.goto("/claim", { waitUntil: "domcontentloaded" });
  await waitForApp(page);

  const connectBtn = page.getByRole("button", { name: /connect wallet/i });
  await connectBtn.waitFor({ state: "visible", timeout: 15_000 });

  const before = await page.evaluate(() => ({
    iframes: document.querySelectorAll("iframe").length,
    fixed: document.querySelectorAll(
      'div[style*="position: fixed"], div[style*="position:fixed"]',
    ).length,
    bodyDivs: document.body.children.length,
  }));

  await connectBtn.click();

  const grew = await page
    .waitForFunction(
      ({ before }) => {
        const after = {
          iframes: document.querySelectorAll("iframe").length,
          fixed: document.querySelectorAll(
            'div[style*="position: fixed"], div[style*="position:fixed"]',
          ).length,
          bodyDivs: document.body.children.length,
        };
        return (
          after.iframes > before.iframes ||
          after.fixed > before.fixed ||
          after.bodyDivs > before.bodyDivs
        );
      },
      { before },
      { timeout: 15_000 },
    )
    .then(() => true)
    .catch(() => false);

  expect(
    grew,
    "expected Privy modal/portal to mount after clicking Connect Wallet",
  ).toBe(true);
});

test("/claim shows Connect Wallet button when not authenticated", async ({
  page,
}) => {
  await page.goto("/claim", { waitUntil: "domcontentloaded" });
  await waitForApp(page);
  await expect(page.locator("h1").first()).toContainText(/claim/i);
  await expect(
    page.getByRole("button", { name: /connect wallet/i }),
  ).toBeVisible();
});
