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

test("/dashboard/<unregistered> shows 'not registered' empty state", async ({
  page,
}) => {
  await page.goto("/dashboard/this-org-does-not-exist/this-repo-does-not-exist", {
    waitUntil: "domcontentloaded",
  });
  await waitForApp(page);
  await expect(page.locator("body")).toContainText(/not registered/i, {
    timeout: 15_000,
  });
});

test("/dashboard/alnamodevloper/gitdrip-demo shows the registered repo state", async ({
  page,
}) => {
  await page.goto("/dashboard/alnamodevloper/gitdrip-demo", {
    waitUntil: "domcontentloaded",
  });
  await waitForApp(page);
  // The registered repo must NOT show the empty state headline.
  await expect(page.locator("body")).not.toContainText(/not registered yet/i, {
    timeout: 15_000,
  });
  // It must surface the pool + maintainer somewhere on the page.
  await expect(page.locator("body")).toContainText(/pool/i, { timeout: 15_000 });
  await expect(page.getByText(/0x3ebd/i).first()).toBeVisible({
    timeout: 15_000,
  });
});
