import { expect, test } from "@playwright/test";

test("admin approval shows confirmation and next steps", async ({ page }) => {
  await page.goto("/admin");

  await expect(page.getByRole("heading", { name: "Operator console" })).toBeVisible();
  await page.getByRole("button", { name: /Approve/ }).first().click();

  await expect(page).toHaveURL(/status=demo-application-approved/, {
    timeout: 30_000,
  });

  const status = page.getByRole("status");
  await expect(status).toContainText("Application approved.");
  await expect(status).toContainText("Steward access is active");
  await expect(status).toContainText(
    "Next step: the steward submits the first Stellar payout address",
  );
  await expect(status).toContainText(
    "No funding batch can be created until that address is verified",
  );
});

test("admin one-line batch converts USDC and COP both ways", async ({ page }) => {
  await page.goto("/admin#batches");
  await expect(page.getByText("Daily market rate: 1 USD = 3,900.00 COP")).toBeVisible();

  const usdc = page.getByLabel("USDC");
  const cop = page.getByLabel("COP");

  await usdc.fill("2");
  await expect(cop).toHaveValue("7800");

  await cop.fill("19500");
  await expect(usdc).toHaveValue("5");
});
