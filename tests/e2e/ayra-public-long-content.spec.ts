import { expect, test, type Page } from "@playwright/test";

const longTitle =
  "Luz Marina Regenerative Plant Nursery and Learning Garden for Providencia";
const longScope = Array.from(
  { length: 5 },
  () =>
    "Establish and validate a water-secure community plant nursery that serves local families, hospitality gardens, and environmental workshops.",
).join(" ");
const longProposal = Array.from(
  { length: 8 },
  () =>
    "Funding, governance, seasonal risks, evidence releases, and public reporting remain documented in the approved application.",
).join(" ");

async function injectLongApplicationContent(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(
    ({ proposal, scope, title }) => {
      const projectTitle = document.querySelector<HTMLElement>(".project-detail-title");
      const scopeText = document.querySelector<HTMLElement>(
        ".project-scope .public-rich-text",
      );
      const proposalText = document.querySelector<HTMLElement>(
        ".proposal-details .public-rich-text",
      );
      if (!projectTitle || !scopeText || !proposalText) {
        throw new Error("Project narrative regions are missing.");
      }
      projectTitle.textContent = title;
      scopeText.textContent = scope;
      proposalText.textContent = `${proposal} https://example.org/proposals/luz-marina-regenerative-nursery`;
    },
    { proposal: longProposal, scope: longScope, title: longTitle },
  );
}

test.describe("public project long-content resilience", () => {
  test("keeps a full application readable on desktop", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    await page.goto("/projects/providencia/reforestation");
    await injectLongApplicationContent(page);

    const measurements = await page.evaluate(() => {
      const title = document.querySelector<HTMLElement>(".project-detail-title")!;
      const scope = document.querySelector<HTMLElement>(".project-scope")!;
      const proposal = document.querySelector<HTMLElement>(".proposal-details")!;
      return {
        hasHorizontalOverflow:
          document.documentElement.scrollWidth > window.innerWidth + 1,
        proposalWidth: proposal.getBoundingClientRect().width,
        scopeWidth: scope.getBoundingClientRect().width,
        titleWidth: title.getBoundingClientRect().width,
      };
    });

    expect(measurements.hasHorizontalOverflow).toBe(false);
    expect(measurements.titleWidth).toBeGreaterThan(360);
    expect(measurements.scopeWidth).toBeGreaterThan(360);
    expect(measurements.proposalWidth).toBeGreaterThan(360);
    expect(consoleErrors).toEqual([]);
  });

  test("stacks the narrative and updates without overflow on mobile", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    await page.setViewportSize({ height: 844, width: 390 });
    await page.goto("/projects/providencia/reforestation");
    await injectLongApplicationContent(page);

    const measurements = await page.evaluate(() => {
      const main = document.querySelector<HTMLElement>(".project-detail-layout > div")!;
      const title = document.querySelector<HTMLElement>(".project-detail-title")!;
      const updates = document.querySelector<HTMLElement>(".updates-timeline")!;
      return {
        hasHorizontalOverflow:
          document.documentElement.scrollWidth > window.innerWidth + 1,
        mainBottom: main.getBoundingClientRect().bottom,
        titleWidth: title.getBoundingClientRect().width,
        updatesTop: updates.getBoundingClientRect().top,
      };
    });

    expect(measurements.hasHorizontalOverflow).toBe(false);
    expect(measurements.titleWidth).toBeGreaterThan(330);
    expect(measurements.updatesTop).toBeGreaterThanOrEqual(measurements.mainBottom - 1);
    expect(consoleErrors).toEqual([]);
  });
});
