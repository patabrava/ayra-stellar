import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("AYRA Impressum", () => {
  const footer = readFileSync("src/components/ayra/site-footer.tsx", "utf8");
  const layout = readFileSync("src/app/layout.tsx", "utf8");
  const formerPageLocalFooterFiles = [
    "src/app/page.tsx",
    "src/app/privacy/page.tsx",
    "src/app/projects/[trackSlug]/[initiativeSlug]/page.tsx",
  ];

  it("links the Impressum from the shared footer on every route", () => {
    assert.match(footer, /href="\/impressum"/);
    assert.match(layout, /import \{ SiteFooter \}/);
    assert.match(layout, /\{children\}\s*<SiteFooter \/>/);

    for (const file of formerPageLocalFooterFiles) {
      assert.doesNotMatch(readFileSync(file, "utf8"), /SiteFooter/);
    }
  });

  it("publishes the supplied company ownership details on an Impressum page", () => {
    const legalPath = "src/lib/ayra/legal.ts";
    const pagePath = "src/app/impressum/page.tsx";

    assert.equal(existsSync(legalPath), true);
    assert.equal(existsSync(pagePath), true);

    const legal = readFileSync(legalPath, "utf8");
    const page = readFileSync(pagePath, "utf8");

    assert.match(legal, /CREADOR LABS UG \(haftungsbeschränkt\)/);
    assert.match(legal, /Heideweg 3, 76149 Karlsruhe, Germany/);
    assert.match(legal, /Amtsgericht Mannheim/);
    assert.match(legal, /HRB 748597/);
    assert.match(legal, /Nicolas Samuel Weber/);
    assert.match(legal, /Camilo Andrés Echeverri Mahecha/);
    assert.match(legal, /DE365784924/);
    assert.match(legal, /sozial@ayra\.haus/);
    assert.match(page, /LEGAL_NOTICE/);
    assert.match(page, /mailto:\$\{LEGAL_NOTICE\.email\}/);
  });
});
