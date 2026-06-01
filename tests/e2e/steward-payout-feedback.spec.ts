import { expect, test } from "@playwright/test";

test("steward payout address submission opens success and error feedback modals", async ({
  page,
}) => {
  await page.goto("/steward");
  await expect(page.getByRole("heading", { name: "Steward portal" })).toBeVisible();

  await page.getByLabel("Replacement Stellar address").fill(`G${"A".repeat(55)}`);
  await page.getByRole("button", { name: /Replace address/ }).click();

  await expect(page).toHaveURL(/status=demo-payout-submitted/, {
    timeout: 30_000,
  });
  await expect(
    page.getByRole("dialog", {
      name: "Your Stellar payout address is pending AYRA verification.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText(
    "AYRA now has the address you submitted.",
  );

  await page.goto("/steward");
  await page.getByLabel("Replacement Stellar address").fill(`S${"A".repeat(55)}`);
  await page.getByRole("button", { name: /Replace address/ }).click();

  await expect(page).toHaveURL(/status=invalid/, { timeout: 30_000 });
  await expect(
    page.getByRole("dialog", { name: "Some steward fields need another pass." }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText(
    "Stellar payout addresses start with G.",
  );
});
