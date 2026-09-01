import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("AYRA website terms", () => {
  const footer = readFileSync("src/components/ayra/site-footer.tsx", "utf8");
  const termsPath = "src/app/terms/page.tsx";

  it("links the Terms page from the global legal footer", () => {
    assert.match(
      footer,
      /href="\/privacy"[\s\S]*href="\/impressum"[\s\S]*href="\/terms"/,
    );
  });

  it("publishes the approved narrow website-use terms", () => {
    assert.equal(existsSync(termsPath), true);

    const page = readFileSync(termsPath, "utf8");

    assert.match(page, /Terms & Conditions/);
    assert.match(page, /1 September 2026/);
    assert.match(page, /Operator and scope/);
    assert.match(page, /Separate written agreements/);
    assert.match(page, /Purpose of the website/);
    assert.match(page, /Acceptable use/);
    assert.match(page, /Applications and submitted material/);
    assert.match(page, /Accounts and access/);
    assert.match(page, /External services and public records/);
    assert.match(page, /Availability and liability/);
    assert.match(page, /Changes/);
    assert.match(page, /Applicable law/);
    assert.match(page, /Mandatory consumer-protection rules/);
    assert.match(page, /Contact/);
    assert.match(page, /LEGAL_NOTICE/);
    assert.match(page, /mailto:\$\{LEGAL_NOTICE\.email\}/);
  });
});
