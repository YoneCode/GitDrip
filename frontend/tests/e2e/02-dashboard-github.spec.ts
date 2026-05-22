import { test, expect } from "@playwright/test";

/**
 * /dashboard search must make a real call to api.github.com and surface
 * actual repo suggestions. No mocks.
 */
test("dashboard search hits real GitHub API and shows suggestions", async ({
  page,
}) => {
  // Listen for the real github.com request
  const ghRequest = page.waitForRequest(
    (r) =>
      r.url().includes("api.github.com/search/repositories") &&
      r.method() === "GET",
    { timeout: 8000 },
  );

  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await page.locator("input#repo-search").waitFor({ state: "visible", timeout: 15_000 });

  const input = page.locator("input#repo-search");

  // Type a real repo name slowly enough to trigger the debounce
  await input.fill("vercel/next");
  await ghRequest;

  // Wait for the suggestions list to appear
  const suggestions = page.locator("ul[role='listbox'] li");
  await expect(suggestions.first()).toBeVisible({ timeout: 8000 });

  const count = await suggestions.count();
  expect(count, "expected at least one GitHub suggestion").toBeGreaterThan(0);

  // The list should contain a real next.js-related repo
  const text = await page.locator("ul[role='listbox']").innerText();
  expect(text.toLowerCase()).toContain("next");
});
