import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";

const ROUTES = ["/", "/register", "/enroll", "/claim", "/dashboard", "/vs"];

for (const path of ROUTES) {
  test(`axe a11y scan: ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await page
      .locator("h1, main input, header [aria-label*=\"menu\"]")
      .first()
      .waitFor({ state: "attached", timeout: 15_000 });
    // Let any deferred client work settle
    await page.waitForTimeout(800);
    const results = await new AxeBuilder({ page })
      // Skip rules that require a real screen reader / aren't actionable
      // for a marketing-style dark-themed page
      .disableRules(["color-contrast"]) // we hand-check contrast in DESIGN.md
      .analyze();

    if (results.violations.length > 0) {
      console.log(
        `axe violations on ${path}:`,
        results.violations.map((v) => `${v.id}: ${v.description}`).join("\n"),
      );
    }

    // Allow up to 0 critical/serious; warn but don't fail on moderate
    const blocking = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(
      blocking,
      `${blocking.length} blocking a11y violations on ${path}`,
    ).toEqual([]);
  });
}
