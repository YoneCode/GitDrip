import { test, expect } from "@playwright/test";

/**
 * Mobile-only specs. Skipped under chromium-desktop project via beforeEach
 * (the file-level test.skip(condition, reason) signature doesn't accept
 * a function with testInfo).
 */
test.beforeEach(({}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium-mobile",
    "mobile-only spec",
  );
});

test("mobile hamburger toggles nav", async ({ page }) => {
  // Need an inner page (with SiteHeader) — landing has its own minimal nav.
  await page.goto("/register", { waitUntil: "domcontentloaded" });
  const toggle = page.getByRole("button", { name: /open menu|close menu/i });
  await toggle.waitFor({ state: "visible", timeout: 15_000 });

  await toggle.click();
  await expect(
    page.getByRole("link", { name: "register" }).first(),
  ).toBeVisible({ timeout: 5_000 });
  await expect(page.getByRole("link", { name: "claim" }).first()).toBeVisible();
  await expect(
    page.getByRole("link", { name: "dashboard" }).first(),
  ).toBeVisible();

  await page.getByRole("button", { name: /close menu/i }).click();
  await page.waitForTimeout(400);
  // After closing, only desktop-hidden nav links remain → not visible on mobile.
  const stillVisible = await page
    .getByRole("link", { name: "claim" })
    .first()
    .isVisible()
    .catch(() => false);
  expect(stillVisible).toBe(false);
});

test("mobile landing renders hero without horizontal scroll", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page
    .locator("h1")
    .first()
    .waitFor({ state: "visible", timeout: 15_000 });
  await expect(page.locator("h1")).toContainText(/chain/i);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow, "page should not horizontally overflow").toBeLessThanOrEqual(
    2,
  );
});
