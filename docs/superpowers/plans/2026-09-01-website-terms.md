# AYRA Website Terms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the approved website-use Terms & Conditions and expose them through the global AYRA footer.

**Architecture:** Add one static App Router page at `/terms`, reusing `PublicNav` and `LEGAL_NOTICE` so operator identity and contact data stay centralized. Extend the existing global footer with one route link and protect the approved scope and copy with a source-contract regression test.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind/global CSS, Node test runner, Playwright, Vercel

---

### Task 1: Add the global Terms route contract

**Files:**
- Create: `tests/ayra-terms.test.ts`
- Modify: `src/components/ayra/site-footer.tsx`
- Create: `src/app/terms/page.tsx`

- [ ] **Step 1: Write the failing route and content test**

Create `tests/ayra-terms.test.ts` with assertions that:

```ts
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
```

- [ ] **Step 2: Run the focused test to verify RED**

Run: `npx tsx --test tests/ayra-terms.test.ts`

Expected: FAIL because the footer lacks `/terms` and the route does not exist.

- [ ] **Step 3: Add the footer link and Terms page**

Add this link after `Impressum` in `src/components/ayra/site-footer.tsx`:

```tsx
<Link
  className="transition text-[var(--public-muted)] hover:text-[var(--public-fg)]"
  href="/terms"
>
  Terms
</Link>
```

Create `src/app/terms/page.tsx` with metadata, `PublicNav`, the approved `Terms & Conditions` heading and update date, the ten approved numbered sections from `docs/superpowers/specs/2026-09-01-website-terms-design.md`, a semantic unordered list for the five unacceptable-use items, `LEGAL_NOTICE.organization` and `LEGAL_NOTICE.address` for operator identity, and `href={`mailto:${LEGAL_NOTICE.email}`}` for contact. Use the existing public legal-page classes: `public-shell flex-1`, `place-line`, `hero-title`, `public-muted`, `display`, `border-[var(--dark-rule)]`, and responsive `px-[var(--pad-page)]` spacing.

- [ ] **Step 4: Run focused and full tests to verify GREEN**

Run: `npx tsx --test tests/ayra-terms.test.ts`

Expected: 2 tests pass.

Run: `npm test`

Expected: the complete suite passes with no existing regression.

### Task 2: Validate and release the approved Terms page

**Files:**
- Modify only if the regression block identifies a Terms-specific defect.

- [ ] **Step 1: Run the complete local regression block**

Run: `npm test && npm run lint && npm run build`

Expected: all tests pass, ESLint exits cleanly, and Next.js generates `/terms`.

- [ ] **Step 2: Verify the local real-browser flow**

Run the production build locally. At desktop and 390-by-844 mobile widths, open the homepage, follow `Terms`, confirm the exact update date, ten numbered sections, operator, precedence language, liability language, consumer-protection reservation, and `mailto:sozial@ayra.haus`. Confirm one footer, no horizontal overflow, mobile-menu keyboard focus, and zero console errors or warnings.

- [ ] **Step 3: Commit the scoped implementation**

Stage only the plan, test, Terms page, and footer. Commit with `feat: add site-wide website terms`.

- [ ] **Step 4: Synchronize and push main**

Fetch `origin`, verify or rebase onto current `origin/main` if needed, rerun the complete regression block if the base changed, and push `main`.

- [ ] **Step 5: Deploy and verify production**

Deploy the linked `ayra-transparency` project with `npx vercel deploy --prod --yes`. Verify the deployment is `Ready`, remains aliased to `transparency.ayra.haus`, and both `/` and `/terms` return HTTP 200. Repeat the desktop/mobile browser checks against the custom production domain.
