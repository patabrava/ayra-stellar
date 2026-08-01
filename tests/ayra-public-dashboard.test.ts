import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("AYRA public transparency dashboard", () => {
  const page = readFileSync("src/app/page.tsx", "utf8");
  const css = readFileSync("src/app/globals.css", "utf8");
  const advisor = readFileSync("src/components/ayra/advisor-panel.tsx", "utf8");
  const publicNav = readFileSync("src/components/ayra/public-nav.tsx", "utf8");

  it("leads with proof context and honest live-record counts", () => {
    assert.match(page, /Follow the work\./);
    assert.match(page, /Verify the funding\./);
    assert.match(page, /wall\.initiatives\.length/);
    assert.match(page, /wall\.updates\.length/);
    assert.match(page, /wall\.batches\.length/);
    assert.match(page, /formatUsdc\(publishedUsdc\)/);
  });

  it("keeps dashboard navigation and project progress accessible", () => {
    assert.match(page, /Skip to transparency records/);
    assert.match(page, /<PublicNav/);
    assert.match(page, /role="progressbar"/);
    assert.match(page, /aria-valuenow=\{progress\}/);
    assert.match(css, /\.public-menu-toggle/);
    assert.match(publicNav, /aria-expanded=\{open\}/);
    assert.match(publicNav, /event\.key !== "Escape"/);
    assert.match(advisor, /aria-label="Ask AYRA public advisor"/);
  });
});
