import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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

  it("keeps Apply as the single landing-page CTA", () => {
    assert.match(page, /className="public-action public-action-primary" href="\/apply"/);
    assert.match(page, />\s*Apply\s*</);
    assert.doesNotMatch(page, /Explore the project/);
    assert.doesNotMatch(page, /public-closing-actions/);
    assert.doesNotMatch(page, /Open the project record/);
    assert.match(css, /\.public-hero-actions/);
    assert.match(css, /\.public-action-primary/);
    assert.match(
      css,
      /\.public-action \{[\s\S]*?font-size: 18px;[\s\S]*?min-height: 60px;[\s\S]*?min-width: 160px;[\s\S]*?padding: 16px 32px;[\s\S]*?\}/,
    );
  });

  it("keeps the featured project preview concise and meaningful", () => {
    assert.match(page, /projectPreview\(leadInitiative\.headline\)/);
    assert.match(page, /Next milestone/);
    assert.match(page, /formatStatus\(leadInitiative\.status\)/);
    assert.doesNotMatch(page, /\{leadInitiative\.leagueScore\} score/);
  });

  it("adds public wayfinding without a redundant closing record note", () => {
    assert.match(page, /label: "Explore"/);
    assert.match(page, /href: "#projects", label: "Projects"/);
    assert.match(page, /href: "https:\/\/www\.ayra\.haus", label: "About AYRA"/);
    assert.doesNotMatch(page, /className="project-record-note"/);
    assert.doesNotMatch(page, /A living public record/);
    assert.doesNotMatch(
      page,
      /Approved milestones, field updates, and funding releases appear here/,
    );
    assert.doesNotMatch(page, /className="public-closing"/);
    assert.doesNotMatch(page, /Follow this project from its first milestone onward\./);
    assert.doesNotMatch(css, /\.project-record-note/);
    assert.doesNotMatch(css, /\.public-closing/);
  });

  it("renders a quiet logo-only partner rail above the footer", () => {
    assert.match(page, /<PartnerLogoRail \/>/);
    assert.match(css, /\.partner-logo-rail/);
    assert.match(css, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
    assert.doesNotMatch(page, /Project partners/);
    assert.equal(
      existsSync("public/partners/stellar-development-foundation.png"),
      true,
    );
    assert.equal(
      existsSync("public/partners/climate-future-foundation.png"),
      true,
    );
    assert.equal(existsSync("public/partners/sparkclub-logo.svg"), true);
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
