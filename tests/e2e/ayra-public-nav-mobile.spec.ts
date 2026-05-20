import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const mobileViewport = { height: 844, width: 390 };

async function expectCompactPublicNav(page: Page) {
  const nav = page.locator(".public-nav");
  const navBox = await nav.boundingBox();
  expect(navBox?.height ?? 0).toBeLessThanOrEqual(104);

  const anchors = page.locator(".public-nav .public-anchor");
  const count = await anchors.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    const box = await anchors.nth(index).boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  }

  const hasPageOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasPageOverflow).toBe(false);
}

test.describe("public navigation mobile adaptation", () => {
  test.use({ viewport: mobileViewport });

  test("keeps landing navigation compact and touch-safe", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Public wall" })).toBeVisible();
    await expectCompactPublicNav(page);
  });

  test("keeps project navigation compact and touch-safe", async ({ page }) => {
    await page.goto("/projects/providencia/reforestation");
    await expect(page.getByRole("navigation", { name: "Project page" })).toBeVisible();
    await expectCompactPublicNav(page);
  });
});
