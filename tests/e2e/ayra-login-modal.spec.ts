import { expect, test } from "@playwright/test";

test("login status feedback opens in the modal surface", async ({ page }) => {
  await page.goto("/login?status=link-sent");

  await expect(
    page.getByRole("dialog", { name: "Magic link sent." }),
  ).toBeVisible();
});

test("signed-out redirects return to login without opening a modal", async ({
  page,
}) => {
  await page.goto("/login?status=signed-out");

  await expect(
    page.getByRole("heading", { name: "Sign in to AYRA Stellar." }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
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
