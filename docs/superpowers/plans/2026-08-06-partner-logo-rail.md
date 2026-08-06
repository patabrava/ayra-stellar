# Partner Logo Rail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a quiet, responsive three-logo rail above the public landing-page footer using the official Stellar Development Foundation, Climate Future Foundation, and Sparkclub assets.

**Architecture:** A focused `PartnerLogoRail` presentational component owns the semantic section and image markup. The home page places it between Projects and `SiteFooter`; global CSS owns optical sizing and responsive stacking. Brand assets are self-hosted under `public/partners` so the local and deployed page do not depend on third-party image availability.

**Tech Stack:** Next.js 16, React, `next/image`, CSS, Node test runner with `tsx`.

---

## File Structure

- Create `src/components/ayra/partner-logo-rail.tsx` for the accessible logo-only section.
- Create `public/partners/stellar-development-foundation.png` from the official 2026 SDF press kit.
- Create `public/partners/climate-future-foundation.png` from Climate Future’s official website.
- Create `public/partners/sparkclub-logo.svg` from the AYRA landing project.
- Modify `src/app/page.tsx` to render the rail before `SiteFooter`.
- Modify `src/app/globals.css` for the three-column desktop rail and stacked mobile layout.
- Modify `tests/ayra-public-dashboard.test.ts` for regression coverage.

### Task 1: Lock the logo-rail contract with a failing test

**Files:**
- Modify: `tests/ayra-public-dashboard.test.ts`

- [ ] **Step 1: Write the failing regression test**

Add `existsSync` to the `node:fs` import and add this test:

```ts
it("renders a quiet logo-only partner rail above the footer", () => {
  assert.match(page, /<PartnerLogoRail \/>/);
  assert.match(page, /<PartnerLogoRail \/>\s*<SiteFooter \/>/);
  assert.match(css, /\.partner-logo-rail/);
  assert.match(css, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(page, /Project partners/);
  assert.equal(existsSync("public/partners/stellar-development-foundation.png"), true);
  assert.equal(existsSync("public/partners/climate-future-foundation.png"), true);
  assert.equal(existsSync("public/partners/sparkclub-logo.svg"), true);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
npx tsx --test tests/ayra-public-dashboard.test.ts
```

Expected: the new subtest fails because `PartnerLogoRail` and the three local assets do not exist.

### Task 2: Add official partner assets

**Files:**
- Create: `public/partners/stellar-development-foundation.png`
- Create: `public/partners/climate-future-foundation.png`
- Create: `public/partners/sparkclub-logo.svg`

- [ ] **Step 1: Create the partner asset directory**

Run:

```bash
mkdir -p public/partners
```

- [ ] **Step 2: Download and extract the official white SDF mark**

Download the official Stellar 2026 logo press kit to a temporary directory, extract `Logo Press Kit 2026/Stellar Development Foundation/RGB/White/SDF Logo Final White RGB.png`, and copy it to `public/partners/stellar-development-foundation.png`.

- [ ] **Step 3: Download the official Climate Future mark**

Download:

```text
https://www.climatefuture.de/wp-content/themes/bergauf/assets/img/layout/logo.png
```

Save it as `public/partners/climate-future-foundation.png`.

- [ ] **Step 4: Copy the existing AYRA Sparkclub mark**

Copy:

```text
/Users/camiloecheverri/Documents/AI/AYRA MASTER/AYRA LANDING/ayra-epoch-vision/public/sparkclub-logo.svg
```

to `public/partners/sparkclub-logo.svg` without modifying its paths, colors, or proportions.

- [ ] **Step 5: Verify the assets**

Run:

```bash
file public/partners/stellar-development-foundation.png public/partners/climate-future-foundation.png public/partners/sparkclub-logo.svg
```

Expected: two valid PNG images and one valid SVG.

### Task 3: Implement the logo rail

**Files:**
- Create: `src/components/ayra/partner-logo-rail.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Create the component**

```tsx
import Image from "next/image";

const partnerLogos = [
  {
    alt: "Stellar Development Foundation",
    className: "partner-logo partner-logo-stellar",
    height: 161,
    src: "/partners/stellar-development-foundation.png",
    width: 631,
  },
  {
    alt: "Climate Future Foundation",
    className: "partner-logo partner-logo-climate",
    height: 433,
    src: "/partners/climate-future-foundation.png",
    width: 1398,
  },
  {
    alt: "Sparkclub",
    className: "partner-logo partner-logo-sparkclub",
    height: 642,
    src: "/partners/sparkclub-logo.svg",
    width: 2495,
  },
] as const;

export function PartnerLogoRail() {
  return (
    <section aria-label="Partners" className="partner-logo-rail">
      {partnerLogos.map((logo) => (
        <div className="partner-logo-item" key={logo.alt}>
          <Image
            alt={logo.alt}
            className={logo.className}
            height={logo.height}
            sizes="(max-width: 560px) 68vw, 28vw"
            src={logo.src}
            width={logo.width}
          />
        </div>
      ))}
    </section>
  );
}
```

- [ ] **Step 2: Render the component above the footer**

Import `PartnerLogoRail` in `src/app/page.tsx` and render:

```tsx
<PartnerLogoRail />
<SiteFooter />
```

- [ ] **Step 3: Add restrained desktop styles**

```css
.partner-logo-rail {
  border-top: 1px solid var(--dark-rule);
  display: grid;
  gap: clamp(36px, 6vw, 96px);
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding: clamp(34px, 4vw, 52px) var(--pad-page);
}

.partner-logo-item {
  align-items: center;
  display: flex;
  justify-content: center;
  min-height: 72px;
}

.partner-logo {
  height: auto;
  max-width: 100%;
  object-fit: contain;
}

.partner-logo-stellar { width: min(230px, 100%); }
.partner-logo-climate { width: min(240px, 100%); }
.partner-logo-sparkclub { width: min(220px, 100%); }
```

- [ ] **Step 4: Add mobile stacking inside the existing `max-width: 560px` query**

```css
.partner-logo-rail {
  gap: 28px;
  grid-template-columns: 1fr;
}

.partner-logo-item {
  min-height: 54px;
}
```

- [ ] **Step 5: Run the targeted test and verify GREEN**

Run:

```bash
npx tsx --test tests/ayra-public-dashboard.test.ts
```

Expected: all public-dashboard tests pass.

### Task 4: Verify quality and local rendering

**Files:**
- Verify: `src/components/ayra/partner-logo-rail.tsx`
- Verify: `src/app/page.tsx`
- Verify: `src/app/globals.css`
- Verify: `tests/ayra-public-dashboard.test.ts`

- [ ] **Step 1: Check formatting and lint**

Run:

```bash
git diff --check -- src/components/ayra/partner-logo-rail.tsx src/app/page.tsx src/app/globals.css tests/ayra-public-dashboard.test.ts public/partners
npm run lint
```

Expected: both commands exit successfully with no errors.

- [ ] **Step 2: Verify the local server**

Start the app on port 3100 if it is not already listening, then run:

```bash
curl -sS -o /tmp/ayra-partner-home.html -w "%{http_code}" http://localhost:3100/
```

Expected: HTTP `200`, and the HTML contains all three alternative-text values.

- [ ] **Step 3: Inspect desktop and mobile in the in-app browser**

Open `http://localhost:3100/`, scroll to the logo rail, and confirm:

- the rail appears directly above the footer;
- there is no visible heading or explanatory copy;
- all three marks are optically balanced and unclipped;
- the mobile layout stacks without horizontal overflow.

## Commit Note

Do not create an implementation commit from this mixed worktree because `src/app/page.tsx`, `src/app/globals.css`, and `tests/ayra-public-dashboard.test.ts` already contain approved but uncommitted landing-page work. Preserve those changes for the user’s combined review.
