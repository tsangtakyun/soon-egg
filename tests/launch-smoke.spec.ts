import { expect, test } from "playwright/test";

test("landing page and authentication entry points render", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/SOON-EGG/);
  await page.goto("/login");
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/signup");
  await expect(page).toHaveURL(/\/signup/);
});

for (const route of ["/dashboard", "/settings", "/team", "/topic-library", "/tools/script", "/tools/reply", "/tools/subtitle", "/meta-ads"]) {
  test(`logged-out visitors cannot open ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect.poll(() => new URL(page.url()).pathname).toBe("/login");
  });
}

test("unknown routes use the branded not-found page", async ({ page }) => {
  await page.goto("/this-page-does-not-exist-for-launch-smoke-test");
  await expect(page.getByText("搵唔到呢一頁")).toBeVisible();
});

for (const route of ["/privacy", "/terms", "/data-deletion", "/contact"]) {
  test(`${route} is public and linked back to SOON-EGG`, async ({ page }) => {
    await page.goto(route);
    await expect(page.getByRole("link", { name: /返回 SOON-EGG/ })).toBeVisible();
  });
}
