import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("AYRA public transparency dashboard", () => {
  const page = readFileSync("src/app/page.tsx", "utf8");
  const css = readFileSync("src/app/globals.css", "utf8");
  const advisor = readFileSync("src/components/ayra/advisor-panel.tsx", "utf8");
  const publicNav = readFileSync("src/components/ayra/public-nav.tsx", "utf8");

  it("preserves the original place-led landing message", () => {
    assert.match(page, /\{wall\.track\.name\},/);
    assert.match(page, /lived in\./);
    assert.match(page, /Funded by AYRA\./);
    assert.match(page, /AYRA builds impact zones in places we care about\./);
    assert.doesNotMatch(page, /Follow the work\./);
    assert.doesNotMatch(page, /What is documented now/);
    assert.match(css, /padding: 0 var\(--pad-page\) clamp\(72px, 10vw, 128px\)/);
    assert.doesNotMatch(css, /max-width: 11ch/);
    assert.doesNotMatch(css, /min-height: clamp\(500px, 66vh, 680px\)/);
  });

  it("keeps the restored landing navigation and project links accessible", () => {
    assert.match(page, /<PublicNav/);
    assert.match(page, /aria-label=\{`Open \$\{leadInitiative\.name\}`\}/);
    assert.match(css, /\.public-menu-toggle/);
    assert.match(publicNav, /aria-expanded=\{open\}/);
    assert.match(publicNav, /event\.key !== "Escape"/);
    assert.match(advisor, /aria-label="Ask AYRA public advisor"/);
  });
});
