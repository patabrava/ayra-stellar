import { expect, test } from "@playwright/test";

test("seeded MVP journey from application intake to public disbursement proof", async ({
  page,
}) => {
  test.setTimeout(240_000);

  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Public wall" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Providencia", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "Futuromundo", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Providencia,/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Reforestation" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Latest first");
  await expect(page.locator("body")).not.toContainText("Receipts ·");

  await page.getByRole("link", { name: "Open Reforestation" }).click();
  await page.waitForURL(/\/projects\/providencia\/reforestation$/, {
    timeout: 240_000,
  });
  await expect(page.getByRole("heading", { name: "Updates" })).toBeVisible();
  const publicUpdates = page.locator('aside[aria-label="Project updates"] article');
  await expect(publicUpdates.first()).toContainText("Apr 28, 2026");
  await expect(publicUpdates.nth(1)).toContainText("Apr 22, 2026");
  await expect(page.getByRole("link", { name: /Open proof/ })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("leidy@ecoparque.co");
  await expect(page.locator("body")).not.toContainText(
    "receipts/batch-reforest-apr26/crew.pdf",
  );

  await page.goto("/?track=amazonas");
  await expect(page).toHaveURL(/track=amazonas/);
  await expect(page.getByRole("link", { name: "Futuromundo", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("link", { name: "Open Forest Corridor Demo" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Latest first");

  await page.goto("/apply");
  await page.getByLabel("Applicant name").fill("Sofia Rojas");
  await page.getByLabel("Email").fill("sofia@example.org");
  await page.getByLabel("Track").fill("Providencia");
  await page.getByLabel("Initiative").fill("Mangrove nursery");
  await page
    .getByLabel("Scope")
    .fill(
      "A synthetic mangrove nursery lane with public progress updates and local operator ownership.",
    );
  await page
    .getByLabel("Operational details")
    .fill(
      "Monthly updates, one grantee contact, verified Stellar payout address, and admin-led batches.",
    );
  await page.getByLabel("Signal / phone").fill("+57 300 111 2222");
  await page.getByRole("button", { name: /Submit for review/ }).click();
  await expect(page).toHaveURL(/status=demo-submitted/);
  await expect(page.getByText("demo submitted")).toBeVisible();

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Operator console" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Updates publisher" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Batches" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Proof packs" })).toBeVisible();
  await expect(page.getByText("SDP mode").first()).toBeVisible();
  await expect(page.getByText("Mock").first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Export CSV/ })).toBeVisible();

  await page.getByRole("button", { name: /Approve/ }).first().click();
  await expect(page).toHaveURL(/status=demo-application-approved/);
  await expect(page.getByText("demo application approved")).toBeVisible();

  await page.goto("/admin#batches");
  await page.getByRole("button", { name: "Sync status" }).first().click();
  await expect(page).toHaveURL(/status=demo-batch-synced/);
  await expect(page.getByText("demo batch synced")).toBeVisible();
  await page.goto("/admin#batches");
  await page.getByRole("button", { name: "Create ready batch" }).click();
  await expect(page).toHaveURL(/status=demo-batch-created/);
  await expect(page.getByText("demo batch created")).toBeVisible();

  await page.goto("/steward");
  await expect(page.getByRole("heading", { name: "Steward portal" })).toBeVisible();
  await expect(page.getByLabel("Caption")).toBeVisible();
  await expect(page.getByText("Receipts contain supplier information.")).toBeVisible();
  await expect(page.getByText("Verified · locked")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(
    "receipts/batch-reforest-apr26/crew.pdf",
  );
  await expect(page.getByRole("link", { name: "Verified" }).first()).toBeVisible();

  await page.goto("/proof/batch-reforest-mar26");
  await expect(page.getByRole("heading", { name: "PV-REFOREST-MAR26" })).toBeVisible();
  await expect(page.getByText("Public proof pack")).toBeVisible();
  await expect(page.getByText("Cleared")).toBeVisible();
  await expect(page.getByRole("link", { name: /Project page/ })).toHaveAttribute(
    "href",
    "/projects/providencia/reforestation",
  );
  await expect(page.getByRole("cell", { name: "Crew wages" })).toBeVisible();
  await expect(page.getByText("mock-tx-mar-crew")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("leidy@ecoparque.co");
  await expect(page.locator("body")).not.toContainText(
    "receipts/batch-reforest-apr26/crew.pdf",
  );
});
