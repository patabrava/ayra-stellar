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

test("steward update submission opens moderation feedback and error modals", async ({
  page,
}) => {
  await page.goto("/steward#updates");
  await expect(page.getByRole("heading", { name: "Updates" })).toBeVisible();

  await page
    .getByLabel("Caption")
    .fill("Seedlings are ready for a public review update from the field team.");
  await page.getByLabel("Alt text").fill("Seedlings ready for field review.");
  await page.getByLabel("Upload public media").setInputFiles({
    name: "seedlings.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lxW2WQAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await page.getByRole("button", { name: /Submit for review/ }).click();

  await expect(page).toHaveURL(/status=demo-update-submitted/, {
    timeout: 30_000,
  });
  await expect(
    page.getByRole("dialog", { name: "Your update is in the moderation queue." }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText(
    "AYRA will review the caption and media",
  );

  await page.goto("/steward?status=media-error");
  await expect(
    page.getByRole("dialog", { name: "AYRA could not attach the media." }),
  ).toBeVisible();
});

test("steward update upload handles a 1.5 MB PNG through app validation", async ({
  page,
}) => {
  await page.goto("/steward#updates");
  await expect(page.getByRole("heading", { name: "Updates" })).toBeVisible();

  await page.getByLabel("Caption").fill("adsasdasdasd");
  await page.getByLabel("Alt text").fill("asdasdasdasd");
  await page.getByLabel("Upload public media").setInputFiles({
    name: "Download.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(1_581_383, 0),
  });
  await page.getByRole("button", { name: /Submit for review/ }).click();

  await expect(page).toHaveURL(/status=invalid/, { timeout: 30_000 });
  await expect(
    page.getByRole("dialog", { name: "Some steward fields need another pass." }),
  ).toBeVisible();
});

test("steward sign-in callback opens success feedback", async ({ page }) => {
  await page.goto("/steward?status=signed-in");

  await expect(page.getByRole("dialog", { name: "You are signed in." })).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("portal session is active");
});
