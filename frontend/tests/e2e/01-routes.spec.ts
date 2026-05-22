import { test, expect, type Page, type ConsoleMessage } from "@playwright/test";

const ROUTES = [
  { path: "/", name: "landing" },
  { path: "/register", name: "register" },
  { path: "/enroll", name: "enroll" },
  { path: "/claim", name: "claim" },
  { path: "/dashboard", name: "dashboard" },
  { path: "/vs", name: "compare" },
  { path: "/sponsor/genlayerlabs/genvm", name: "sponsor (unregistered repo)" },
  {
    path: "/dashboard/genlayerlabs/genvm",
    name: "dashboard repo (unregistered)",
  },
];

const IGNORED_CONSOLE = [
  /favicon/i,
  /\[Privy\]/,
  /privy.*warning/i,
  /third-party cookie/i,
  /\[Fast Refresh\]/i,
  /downloadable font: download failed/i,
  /Failed to load resource:.*videodelivery/i,
  /CloudFront/i,
  /web3-onboard/i,
  /CORS policy.*api\.github/i,
  /react-dom-client.*Hydration failed/i,
  /LimitExceededRpcError/i,
  /Request exceeds defined limit/i,
  /unhandledRejection/i,
  /rate limit exceeded/i,
  /GenLayer RPC error/i,
];

function attachConsoleCapture(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() !== "error" && msg.type() !== "warning") return;
    const text = msg.text();
    if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
    errors.push(`[${msg.type()}] ${text}`);
  });
  page.on("pageerror", (err) => {
    if (IGNORED_CONSOLE.some((re) => re.test(err.message))) return;
    errors.push(`[pageerror] ${err.message}`);
  });
  return errors;
}

async function waitForAppMounted(page: Page) {
  await page
    .locator('h1, main input, header [aria-label*="menu"]')
    .first()
    .waitFor({ state: "attached", timeout: 15_000 });
}

for (const route of ROUTES) {
  test(`route ${route.path} renders cleanly`, async ({ page }) => {
    const errors = attachConsoleCapture(page);
    const response = await page.goto(route.path, {
      waitUntil: "domcontentloaded",
    });
    expect(response, `no response for ${route.path}`).not.toBeNull();
    expect(response!.status(), `status for ${route.path}`).toBeLessThan(400);

    await waitForAppMounted(page);

    const hasHeading =
      (await page.locator("h1, input#repo-search").count()) > 0;
    expect(hasHeading, `heading missing on ${route.path}`).toBe(true);

    await page.waitForTimeout(800);

    expect(errors, `console errors on ${route.path}\n${errors.join("\n")}`)
      .toEqual([]);
  });
}

test("nav has Home → Register → Enroll → Claim → Dashboard, all clickable", async ({
  page,
  isMobile,
}) => {
  await page.goto("/register", { waitUntil: "domcontentloaded" });
  await waitForAppMounted(page);

  // On mobile the desktop nav is hidden behind the hamburger; open it first.
  if (isMobile) {
    const toggle = page.getByRole("button", { name: /open menu/i });
    await toggle.waitFor({ state: "visible", timeout: 15_000 });
    await toggle.click();
  }

  await page
    .getByRole("link", { name: "enroll" })
    .first()
    .waitFor({ state: "visible", timeout: 15_000 });

  await expect(page.getByRole("link", { name: "home" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "register" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "enroll" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "claim" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "dashboard" }).first()).toBeVisible();

  await page.getByRole("link", { name: "claim" }).first().click();
  await expect(page).toHaveURL(/\/claim$/);

  if (isMobile) {
    await page.getByRole("button", { name: /open menu/i }).click();
  }
  await page.getByRole("link", { name: "home" }).first().click();
  await expect(page).toHaveURL(/^https?:\/\/[^/]+\/$/);
});

test("landing CTA 'Trust the Consensus' navigates to /register", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForAppMounted(page);
  await page.getByRole("link", { name: "Trust the Consensus" }).first().click();
  await expect(page).toHaveURL(/\/register$/);
});
