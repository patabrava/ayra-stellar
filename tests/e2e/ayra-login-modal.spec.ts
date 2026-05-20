import { expect, test } from "@playwright/test";

test("login status feedback opens in the modal surface", async ({ page }) => {
  await page.goto("/login?status=link-sent");

  await expect(
    page.getByRole("dialog", { name: "Magic link sent." }),
  ).toBeVisible();
});
