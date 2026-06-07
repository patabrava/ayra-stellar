import { expect, test } from "@playwright/test";

test("black AYRA advisor answers public funding questions", async ({ page }) => {
  await page.goto("/projects/providencia/reforestation");

  const askAyra = page.getByRole("button", { name: "Ask AYRA" });
  await expect(askAyra).toHaveCount(1);
  await expect(askAyra).toBeVisible();
  await askAyra.click();

  const advisor = page.getByRole("dialog", { name: "Ask AYRA" });
  await expect(advisor).toBeVisible();
  await expect(advisor).toContainText("Public records only");

  await page.getByRole("button", { name: "How much has been paid?" }).click();
  await expect(advisor).toContainText("USDC", { timeout: 30_000 });
  await expect(advisor).toContainText("Funding - Reforestation");

  await page
    .getByRole("button", { name: "How do I watch the transaction hash?" })
    .click();
  await expect(advisor).toContainText("transaction hash", { timeout: 30_000 });
  await expect(advisor).toContainText("Stellar");

  await expect(page.locator("body")).not.toContainText("leidy@ecoparque.co");
  await expect(page.locator("body")).not.toContainText(
    "receipts/batch-reforest-apr26/crew.pdf",
  );
  await expect(page.locator("body")).not.toContainText("GBLEIDYECOPARQUE");
});

test("AYRA advisor shows a live thinking state while answering", async ({ page }) => {
  await page.route("**/api/advisor", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    await route.continue();
  });

  await page.goto("/projects/providencia/reforestation");
  await page.getByRole("button", { name: "Ask AYRA" }).click();

  const advisor = page.getByRole("dialog", { name: "Ask AYRA" });
  await page.getByRole("button", { name: "How much has been paid?" }).click();

  await expect(advisor.getByRole("status", { name: "AYRA is thinking" })).toBeVisible();
  const thinkingPhrase = advisor.locator(".advisor-thinking-phrase");
  await expect(thinkingPhrase).toContainText("Tracing...");
  await expect(advisor.locator(".advisor-thinking-phrase")).toHaveCount(1);
  await expect(advisor.getByText("Following the rail...")).toBeHidden();
  await expect(thinkingPhrase).toContainText("Grounding...", { timeout: 2_000 });
  await expect(advisor.getByRole("button", { name: "Send question" })).toBeDisabled();
});

test("AYRA advisor panel stays inside a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/projects/providencia/reforestation");

  await page.getByRole("button", { name: "Ask AYRA" }).click();
  const advisor = page.getByRole("dialog", { name: "Ask AYRA" });
  await expect(advisor).toBeVisible();

  const box = await advisor.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect(box?.y ?? -1).toBeGreaterThanOrEqual(0);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(844);
});

test("AYRA launcher sits in the lower-right utility zone", async ({ page }) => {
  await page.setViewportSize({ height: 1000, width: 1440 });
  await page.goto("/projects/providencia/reforestation");

  const launcher = page.getByRole("button", { name: "Ask AYRA" });
  await expect(launcher).toBeVisible();

  const box = await launcher.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.x ?? 0).toBeGreaterThan(1100);
  expect(box?.y ?? 0).toBeGreaterThan(800);
});
