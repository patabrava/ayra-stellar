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
