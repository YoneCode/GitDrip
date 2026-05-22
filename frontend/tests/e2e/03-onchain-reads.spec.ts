import { test, expect, type Page } from "@playwright/test";

async function waitForApp(page: Page) {
  await page
    .locator("h1, main input, header [aria-label*=\"menu\"]")
    .first()
    .waitFor({ state: "attached", timeout: 15_000 });
}

test("dashboard polling reports real on-chain deposit count", async ({
  page,
}) => {
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await waitForApp(page);
  const counter = page.locator("text=/\\d+ deposits? on-chain/");
  await expect(counter).toBeVisible({ timeout: 15_000 });
  const text = await counter.innerText();
  expect(text).toMatch(/^\d+ deposits? on-chain$/);
});

test("/sponsor/<unregistered> shows 'not registered yet' empty state", async ({
  page,
}) => {
  await page.goto("/sponsor/this-org-does-not-exist/this-repo-does-not-exist", {
    waitUntil: "domcontentloaded",
  });
  await waitForApp(page);
  await expect(page.locator("h1").first()).toBeVisible();
  await expect(page.getByText(/not registered yet/i)).toBeVisible({
    timeout: 15_000,
  });
});

test("/dashboard/<unregistered> shows 'isn't registered' empty state", async ({
  page,
}) => {
  await page.goto("/dashboard/this-org-does-not-exist/this-repo-does-not-exist", {
    waitUntil: "domcontentloaded",
  });
  await waitForApp(page);
  await expect(page.locator("body")).toContainText(/isn.?t registered/i, {
    timeout: 15_000,
  });
});
