# AYRA Zero AI Slop Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to execute this plan task-by-task. Each task also names the design skill that must be invoked for that pass. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the remaining AI-generated visual tells from AYRA Stellar while preserving the public privacy contract, authenticated workflows, and existing Supabase/Stellar boundaries.

**Architecture:** Keep the current Next.js App Router structure and AYRA domain/data contracts. Remediate the UI in small passes: first mobile navigation, then public composition, then brand/theming, then final polish and re-audit. Do not add dependencies or rewrite the app shell; reduce repetition and make the public transparency surface feel intentionally AYRA-specific.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS v4, CSS variables/OKLCH tokens, `next/image`, Playwright browser verification. `{files: target 5-8 modified, LOC/file: globals.css +80-180, page.tsx +/-60, projects/[trackSlug]/[initiativeSlug]/page.tsx +/-80, proof/[batchId]/page.tsx +/-50, site-footer.tsx +/-25, optional ui.tsx +/-40, deps: 0}`

---

## Audit Baseline

- Current audit score: `14/20` Good.
- Target audit score: `18-20/20` Excellent.
- Current anti-pattern score: `1/4`.
- Target anti-pattern score: `4/4`.
- Verified live app URL during audit: `http://localhost:3202/`.
- Do not use `localhost:3000` for AYRA verification unless the running process is confirmed to be this repo; audit found another Stellar app on that port.

## Findings To Fix

- Mobile public/project navigation wraps into dense sticky multi-row controls on 390px width.
- Public wall uses a repeated equal-card grid with image top, score chip, body copy, and CTA across all initiatives.
- Project/proof pages repeat the same bordered panels, stat boxes, mono chips, and tables, producing a polished generated-dashboard feel.
- Theme is tokenized and functional, but the public visual language is one-note: dark field, thin borders, compact chips, card/table rhythm.
- Accessibility and performance are already strong; preserve them while changing composition.

## Global Constraints

- Preserve public privacy rules: no steward email, private contact data, raw receipt paths, failed payment details, or internal reconciliation notes on public/proof routes.
- Preserve route split: `/` stays overview-only; detailed receipts/proof context stays on `/projects/[trackSlug]/[initiativeSlug]` and `/proof/[batchId]`.
- Preserve existing form/action contracts, selectors used by e2e tests, and role-gated auth behavior.
- Do not add dependencies.
- Do not add decorative gradient orbs, glassmorphism, generic hero metrics, or nested cards.
- Use actual project imagery already in `public/mockups/`; do not introduce abstract SVG hero art.
- Keep all touch targets at least 44px.
- Keep `npm test`, `npm run lint`, `npm run build`, and `npm run test:e2e` passing.

## File Map

- Modify `src/app/globals.css`: responsive nav behavior, public layout primitives, stronger brand texture, repeated-surface reduction, mobile constraints.
- Modify `src/app/page.tsx`: replace equal-card public wall with more varied overview composition while keeping project entry points.
- Modify `src/app/projects/[trackSlug]/[initiativeSlug]/page.tsx`: reduce stat-card repetition, make proof/spend/update sections feel like one project dossier.
- Modify `src/app/proof/[batchId]/page.tsx`: make proof page more receipt-led and less generic stat-dashboard.
- Modify `src/components/ayra/site-footer.tsx`: ensure footer remains compact and does not add visual noise.
- Optional modify `src/components/ayra/ui.tsx`: only if a small shared primitive is needed to avoid duplicating navigation or proof treatments.
- Do not modify backend/domain/Supabase files unless a UI change exposes a real contract bug.

## Task 1: `/adapt` Mobile Public Navigation

**Required skill:** `/adapt`

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/page.tsx`
- Modify: `src/app/projects/[trackSlug]/[initiativeSlug]/page.tsx`

- [ ] **Step 1: Invoke `/adapt` and scope it to public/project navigation**

Use this scope:

```text
Adapt AYRA Stellar public navigation for mobile. Fix the dense sticky nav on `/` and `/projects/[trackSlug]/[initiativeSlug]` without changing route semantics, public privacy rules, or backend contracts.
```

- [ ] **Step 2: Replace mobile multi-row pressure with a compact pattern**

Implementation target:

```text
Desktop: keep visible track/project links.
Mobile: keep wordmark first row, put track/project links into a horizontally scrollable control or compact two-action row that does not consume more than roughly 104px total sticky height.
```

Expected CSS direction:

```css
@media (max-width: 640px) {
  .public-nav {
    gap: 10px;
    padding-block: 14px;
  }

  .public-nav > div {
    flex-wrap: nowrap;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
  }

  .public-anchor {
    flex: 0 0 auto;
    min-height: 44px;
    white-space: nowrap;
  }
}
```

- [ ] **Step 3: Verify mobile nav dimensions**

Run the app and inspect:

```bash
npm run dev -- -p 3202
```

Browser checks:

```text
Open http://localhost:3202/ at 390x844.
Open http://localhost:3202/projects/providencia/reforestation at 390x844.
Confirm nav remains usable, visible, and does not crowd the hero/project title.
Confirm no horizontal page scroll except intentional nav/table scrolling.
```

- [ ] **Step 4: Run validation**

```bash
npm run lint
npm run build
```

Expected: both pass.

## Task 2: `/arrange` Public Wall And Project Composition

**Required skill:** `/arrange`

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/projects/[trackSlug]/[initiativeSlug]/page.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Invoke `/arrange` with the anti-template target**

Use this scope:

```text
Rearrange AYRA Stellar public wall and project detail composition to remove repeated equal-card AI slop while preserving project entry points, approved public data, and proof routing.
```

- [ ] **Step 2: Break the equal-card grid on `/`**

Implementation target:

```text
Make Reforestation the editorial lead/project anchor.
Render remaining initiatives as a tighter index, ledger strip, or asymmetric stack.
Keep every initiative reachable through a normal link.
Keep image alt text and current `next/image` usage.
```

Do not keep all initiatives as identical image-top cards with score chips.

- [ ] **Step 3: Convert project detail into a dossier rhythm**

Implementation target:

```text
Keep the lead image and headline.
Replace the three equal chart cards with a mixed composition: progress rail, public proof rule, and batch volume should not all share the same card shell.
Keep updates readable in an aside or timeline.
Keep receipts in an overflow-safe table or ledger.
```

- [ ] **Step 4: Verify desktop and mobile composition**

Browser checks:

```text
Open `/` at 1418x721 and 390x844.
Open `/projects/providencia/reforestation` at 1418x721 and 390x844.
Confirm the first viewport has a clear AYRA/Providencia signal and a hint of the next section.
Confirm public/project pages no longer read as a repeated card gallery.
```

- [ ] **Step 5: Run validation**

```bash
npm run lint
npm run build
npm run test:e2e
```

Expected: all pass; browser smoke privacy assertions remain valid.

## Task 3: `/bolder` Public Brand And Theme Pass

**Required skill:** `/bolder`

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/page.tsx`
- Modify: `src/app/projects/[trackSlug]/[initiativeSlug]/page.tsx`
- Modify: `src/app/proof/[batchId]/page.tsx`

- [ ] **Step 1: Invoke `/bolder` with a constrained brand brief**

Use this scope:

```text
Strengthen AYRA Stellar's public visual identity without adding decorative slop. Use Providencia, transparency, receipts, and field work as the design basis. Avoid generic dark dashboard, glassmorphism, gradient text, and card sprawl.
```

- [ ] **Step 2: Add product-specific public texture**

Implementation target:

```text
Use existing project imagery, ledger/proof structure, field-note rhythm, or map/receipt-inspired lines as layout devices.
Do not add abstract gradient blobs, bokeh, SVG hero illustrations, or decorative sparklines.
```

- [ ] **Step 3: Expand the palette beyond one-note dark panels**

Implementation target:

```text
Keep current OKLCH token discipline.
Add one or two public-specific accent/material tokens if needed.
Use them to distinguish hero, project index, proof, and receipt regions.
Keep contrast AA or better for normal text.
```

- [ ] **Step 4: Make proof page less generic**

Implementation target:

```text
Make `/proof/[batchId]` feel like a public receipt/proof pack, not a generic stat modal.
Keep category-level receipts, payment proof hashes, and the exclusion notice.
Keep the table overflow-safe on mobile.
```

- [ ] **Step 5: Run validation**

```bash
npm run lint
npm run build
npm run test:e2e
```

Expected: all pass; public privacy boundaries remain unchanged.

## Task 4: `/polish` Final Fit, Copy, And State Pass

**Required skill:** `/polish`

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/ayra/site-footer.tsx`
- Optional modify: `src/components/ayra/ui.tsx`
- Optional modify: touched route files from Tasks 1-3

- [ ] **Step 1: Invoke `/polish` after Tasks 1-3 are green**

Use this scope:

```text
Polish AYRA Stellar after anti-slop remediation. Fix spacing, focus states, touch targets, text fit, contrast, responsive overflow, and repeated microcopy. Do not introduce new visual concepts.
```

- [ ] **Step 2: Check text fit and controls**

Inspect these widths:

```text
390x844
768x1024
1418x721
```

Required outcomes:

```text
No incoherent overlap.
No clipped button text.
No unintended horizontal page scroll.
Tables scroll only inside their wrappers.
Footer links remain tappable and compact.
Focus-visible remains obvious on dark and light surfaces.
```

- [ ] **Step 3: Remove redundant copy**

Targets:

```text
Keep privacy/exclusion statements where they protect user trust.
Remove repeated explanatory lines that say the same thing in adjacent sections.
Keep public copy concrete and field/proof-specific.
```

- [ ] **Step 4: Run full validation**

```bash
npm test
npm run lint
npm run build
npm run test:e2e
```

Expected: all pass.

## Task 5: `/audit` Re-Audit And Acceptance

**Required skill:** `/audit`

**Files:**
- No implementation files unless the audit exposes a concrete defect.
- Optional create/update: `docs/superpowers/plans/2026-05-20-ayra-zero-ai-slop-remediation.md` only to mark execution status.

- [ ] **Step 1: Invoke `/audit` against the changed app**

Use this scope:

```text
Re-audit AYRA Stellar public, project, proof, apply, login, admin, and steward surfaces after anti-slop remediation. Score accessibility, performance, theming, responsive design, and anti-patterns.
```

- [ ] **Step 2: Browser verify the public surfaces**

Inspect:

```text
/
/privacy
/projects/providencia/reforestation
/proof/5fd1cbab-93a3-4892-88c0-24407b7d7d9a
/apply
/login
```

Use desktop and mobile widths:

```text
1418x721
390x844
```

- [ ] **Step 3: Browser verify role-gated surfaces**

Inspect with the repo's existing seeded/demo auth behavior:

```text
/admin
/steward
```

Acceptance:

```text
Private contacts may appear only on scoped steward/admin pages.
Raw receipt paths must not appear on public/proof pages.
Steward/admin route behavior must match existing e2e expectations.
```

- [ ] **Step 4: Pass/fail criteria**

Pass only if:

```text
Audit Health Score is 18/20 or higher.
Anti-Patterns score is 4/4.
No P0 or P1 findings.
No remaining "AI-generated" verdict.
Full validation commands pass.
```

If the score is below target, create a short follow-up issue list and stop; do not keep making broad visual changes without a new targeted plan.

## Execution Order

1. `/adapt` mobile public navigation.
2. `/arrange` public/project composition.
3. `/bolder` brand/theme strengthening.
4. `/polish` fit, copy, and state cleanup.
5. `/audit` final scoring.

## Done Criteria

- `npm test` passes.
- `npm run lint` passes.
- `npm run build` passes.
- `npm run test:e2e` passes.
- Browser checks pass at desktop and mobile widths.
- Public privacy assertions remain true.
- `/` no longer reads as an equal-card AI gallery.
- `/projects/[trackSlug]/[initiativeSlug]` no longer reads as a generic dark metrics dashboard.
- `/proof/[batchId]` reads as an AYRA proof/receipt surface.
- Final `/audit` reports `18/20` or higher and `Anti-Patterns 4/4`.

