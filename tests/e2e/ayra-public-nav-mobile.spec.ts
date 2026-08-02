import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const mobileViewport = { height: 844, width: 390 };

async function expectCompactPublicNav(page: Page) {
  const nav = page.locator(".public-nav");
  const navBox = await nav.boundingBox();
  expect(navBox?.height ?? 0).toBeLessThanOrEqual(72);

  const toggle = page.getByRole("button", { name: "Toggle navigation menu" });
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  const toggleBox = await toggle.boundingBox();
  expect(toggleBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(toggleBox?.width ?? 0).toBeGreaterThanOrEqual(44);

  const actions = page.locator(".public-nav-actions");
  await expect(actions).toBeHidden();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(actions).toBeVisible();

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

  const login = page.getByRole("link", { name: "Login" });
  if (await login.count()) {
    await expect(login).toBeVisible();
  }

  await page.keyboard.press("Escape");
  await expect(actions).toBeHidden();
  await expect(toggle).toBeFocused();
}

test.describe("public navigation mobile adaptation", () => {
  test.use({ viewport: mobileViewport });

  test("keeps landing navigation compact and touch-safe", async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Public wall" })).toBeVisible();
    await expectCompactPublicNav(page);
    await expect(
      page.getByRole("heading", { level: 1, name: /Providencia.*lived in.*Funded by AYRA/s }),
    ).toBeVisible();
    await expect(page.getByText(/AYRA builds impact zones in places we care about/)).toBeVisible();
    await expect(page.getByRole("link", { name: /Open Reforestation/i })).toBeVisible();
    await expect(page.locator(".lead-project-visual img")).toHaveJSProperty("complete", true);

    const advisor = page.getByRole("button", { name: "Ask AYRA public advisor" });
    await advisor.click();
    await expect(page.getByRole("dialog", { name: "Ask AYRA" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Close advisor" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Ask AYRA" })).toHaveCount(0);
    await expect(advisor).toBeFocused();
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test("keeps project navigation compact and touch-safe", async ({ page }) => {
    await page.goto("/projects/providencia/reforestation");
    await expect(page.getByRole("navigation", { name: "Project page" })).toBeVisible();
    await expectCompactPublicNav(page);
  });
});
