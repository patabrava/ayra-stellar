import { expect, test } from "@playwright/test";

test("login status feedback opens in the modal surface", async ({ page }) => {
  await page.goto("/login?status=link-sent");

  await expect(
    page.getByRole("dialog", { name: "Magic link sent." }),
  ).toBeVisible();
});

test("unknown login feedback tells visitors to apply first or use admin", async ({
  page,
}) => {
  await page.goto("/login?status=application-required");

  await expect(
    page.getByRole("dialog", {
      name: "Apply first, or use an admin account.",
    }),
  ).toBeVisible();
  await expect(page.getByText("Submit an application first")).toBeVisible();
});
