# AYRA Impressum Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a complete German-style Impressum and make its link available in the footer on every AYRA application route.

**Architecture:** Keep the legal record in a small typed module, render it through a dedicated App Router page, and move the existing shared footer to the root layout. Remove page-local footer instances so each route has exactly one legal footer.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind/global CSS, Node test runner, Playwright, Vercel

---

### Task 1: Establish the site-wide footer contract

**Files:**
- Create: `tests/ayra-impressum.test.ts`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/privacy/page.tsx`
- Modify: `src/app/projects/[trackSlug]/[initiativeSlug]/page.tsx`
- Modify: `src/components/ayra/site-footer.tsx`

- [ ] **Step 1: Write the failing global-footer test**

Create a source-contract test that asserts the footer contains `href="/impressum"`, the root layout renders `<SiteFooter />` after `{children}`, and page-local files no longer render `SiteFooter`.

- [ ] **Step 2: Run the focused test to verify RED**

Run: `npm test -- tests/ayra-impressum.test.ts`

Expected: FAIL because the Impressum link and global footer placement do not exist yet.

- [ ] **Step 3: Implement the global footer**

Import and render `SiteFooter` in `src/app/layout.tsx`, add the Impressum link beside Privacy, and remove the three page-local imports/usages. Keep existing contact and social links unchanged.

- [ ] **Step 4: Run the focused test to verify GREEN**

Run: `npm test -- tests/ayra-impressum.test.ts`

Expected: PASS with no duplicate page-local footer instances.

### Task 2: Add the authoritative legal notice page

**Files:**
- Create: `src/lib/ayra/legal.ts`
- Create: `src/app/impressum/page.tsx`
- Modify: `tests/ayra-impressum.test.ts`

- [ ] **Step 1: Write the failing legal-content test**

Extend the test to require the `/impressum` route and exact supplied strings for company name, address, registry, managing directors, VAT ID, and contact email.

- [ ] **Step 2: Run the focused test to verify RED**

Run: `npm test -- tests/ayra-impressum.test.ts`

Expected: FAIL because the legal module and page are absent.

- [ ] **Step 3: Implement the legal record and page**

Create an immutable `LEGAL_NOTICE` value in `src/lib/ayra/legal.ts`. Render it on `src/app/impressum/page.tsx` with existing `PublicNav`, editorial typography, responsive spacing, semantic address markup, a clickable `mailto:` contact, and route metadata. Do not add unrequested boilerplate.

- [ ] **Step 4: Run the focused test to verify GREEN**

Run: `npm test -- tests/ayra-impressum.test.ts`

Expected: PASS with every supplied value represented exactly once in the legal source.

### Task 3: Validate, commit, publish, and verify production

**Files:**
- Modify only if validation reveals an Impressum regression.

- [ ] **Step 1: Run the complete local regression block**

Run: `npm test && npm run lint && npm run build`

Expected: all tests pass, ESLint exits cleanly, and Next.js produces `/impressum` successfully.

- [ ] **Step 2: Verify the real local browser flow**

Start the built site and use a browser at desktop and mobile widths. Open `/`, follow `Impressum`, verify all legal fields and the email link, open another route, confirm one footer per page, test keyboard focus, check horizontal overflow, and confirm the browser console has no errors.

- [ ] **Step 3: Commit the implementation**

Stage only the Impressum plan, test, legal source, page, layout, shared footer, and page-local footer removals. Commit with `feat: add site-wide Impressum`.

- [ ] **Step 4: Rebase and push main safely**

Fetch `origin`, rebase the scoped local commits onto current `origin/main` if needed, rerun the complete regression block if the base changed, and push `main`.

- [ ] **Step 5: Deploy the linked Vercel project**

Run the repository's linked production deployment command and record the deployment URL and ID. Preserve the existing domain assignment: `transparency.ayra.haus` remains on `ayra-transparency`.

- [ ] **Step 6: Verify production**

Confirm `https://transparency.ayra.haus/` and `https://transparency.ayra.haus/impressum` return HTTP 200. In a real browser, repeat the footer-link, exact-content, mobile layout, keyboard, overflow, email-link, and console checks against production.
