import { expect, test } from "@playwright/test";

test("admin approval shows confirmation and next steps", async ({ page }) => {
  await page.goto("/admin/applications");

  await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();
  await page.getByRole("button", { name: /Approve/ }).first().click();

  await expect(page).toHaveURL(/\/admin\/applications\?status=demo-application-approved/, {
    timeout: 30_000,
  });

  const dialog = page.getByRole("dialog", { name: "Application approved." });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Steward access is active");
  await expect(dialog).toContainText(
    "Next step: the steward submits the first Stellar payout address",
  );

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

test("admin can reject a pending application", async ({ page }) => {
  await page.goto("/admin/applications");

  await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();
  await page.getByRole("button", { name: /Reject/ }).first().click();

  await expect(page).toHaveURL(/\/admin\/applications\?status=demo-application-rejected/, {
    timeout: 30_000,
  });
  await expect(page.getByRole("status")).toContainText("Application rejected.");
  await expect(page.getByRole("status")).toContainText(
    "no steward or grantee-contact access was granted",
  );
});

test("admin submit actions always open success or error feedback modals", async ({
  page,
}) => {
  await page.goto("/admin/updates");
  await expect(page.getByRole("heading", { name: "Updates publisher" })).toBeVisible();
  await page.getByRole("button", { name: "Approve" }).first().click();
  await expect(page).toHaveURL(/\/admin\/updates\?status=demo-update-moderated/, {
    timeout: 30_000,
  });
  await expect(page.getByRole("dialog", { name: "Update moderated." })).toBeVisible();

  await page.goto("/admin/batches");
  await page.getByRole("button", { name: "Sync status" }).first().click();
  await expect(page).toHaveURL(/\/admin\/batches\?status=demo-batch-synced/, {
    timeout: 30_000,
  });
  await expect(page.getByRole("dialog", { name: "Batch status synced." })).toBeVisible();

  await page.goto("/admin/batches");
  await page.getByRole("button", { name: "Create ready batch" }).click();
  await expect(page).toHaveURL(/\/admin\/batches\?status=demo-batch-created/, {
    timeout: 30_000,
  });
  await expect(page.getByRole("dialog", { name: "Batch draft created." })).toBeVisible();

  await page.goto("/admin/registry");
  await page.getByRole("button", { name: "Verify" }).first().click();
  await expect(page).toHaveURL(/\/admin\/registry\?status=demo-payout-verified/, {
    timeout: 30_000,
  });
  await expect(page.getByRole("dialog", { name: "Payout address verified." })).toBeVisible();

  await page.goto("/admin/batches?status=sdp-error");
  await expect(page.getByRole("dialog", { name: "The Stellar SDP step failed." })).toBeVisible();
});

test("admin one-line batch converts USDC and COP both ways", async ({ page }) => {
  await page.goto("/admin/batches");
  await expect(page.getByText("Daily market rate: 1 USD = 3,900.00 COP")).toBeVisible();

  const usdc = page.getByLabel("USDC");
  const cop = page.getByLabel("COP");

  await usdc.fill("2");
  await expect(cop).toHaveValue("7800");

  await cop.fill("19500");
  await expect(usdc).toHaveValue("5");
});

test("admin sign-in callback opens success feedback", async ({ page }) => {
  await page.goto("/admin?status=signed-in");

  await expect(page.getByRole("dialog", { name: "You are signed in." })).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("operator session is active");
});

test("admin one-line batch selector updates selected initiative preview", async ({
  page,
}) => {
  await page.goto("/admin/batches");

  await expect(page.getByText("Create one-line batch")).toBeVisible();
  const composer = page
    .locator("form")
    .filter({ hasText: "Create one-line batch" });
  const selector = composer.getByLabel("Target initiative");
  await expect(selector).toHaveValue("initiative-reforest");
  let preview = composer.locator('[data-active-target="initiative-reforest"]');
  await expect(preview.getByText("Reforestation")).toBeVisible();
  await expect(preview.getByText("AYRA-PVD-REFOREST")).toBeVisible();
  await expect(preview.getByText("Leidy Mendoza")).toBeVisible();
  await expect(preview.getByText("Active verified payout destination")).toBeVisible();

  await selector.selectOption("initiative-sterilization");

  await expect(selector).toHaveValue("initiative-sterilization");
  preview = composer.locator('[data-active-target="initiative-sterilization"]');
  await expect(preview.getByText("Dog Sterilization")).toBeVisible();
  await expect(preview.getByText("AYRA-PVD-STERIL")).toBeVisible();
  await expect(preview.getByText("Dr. M. Gomez")).toBeVisible();
  await expect(preview.getByText("No verified payout address")).toBeVisible();
  await expect(
    composer.getByRole("button", { name: "Create ready batch" }),
  ).toBeDisabled();
});
