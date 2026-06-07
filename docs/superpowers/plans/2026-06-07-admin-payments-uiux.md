# Admin Payments UIUX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the admin payments view so operators can create one-line payments, scan batch status, and run submit/sync actions without horizontal scrolling.

**Architecture:** Keep all payment business logic and server actions unchanged. Reorder the page into a full-width payment composer followed by a full-width operational batch queue, with payment proof metadata demoted into wrapped secondary details. Add route-local CSS classes in the global stylesheet because this repo already keeps shared admin UI primitives in `src/app/globals.css`.

**Tech Stack:** Next.js App Router, React Server Components, TypeScript, Tailwind utility classes, shared CSS tokens in `src/app/globals.css`, Playwright E2E, Node `tsx --test`.

**Implementation Budget:** `{files: 4, LOC/file: src/app/admin/batches/page.tsx +90/-75, src/app/globals.css +120/-0, tests/e2e/admin-approval-feedback.spec.ts +35/-8, tests/ayra-admin-batch-form.test.ts +25/-0, deps: 0}`

---

## File Structure

- Modify `src/app/admin/batches/page.tsx`
  - Responsibility: Admin payments route markup. Keep `createBatchAction`, `submitBatchAction`, `syncBatchStatusAction`, `BatchInitiativeTarget`, currency fields, and data mapping intact. Change only layout hierarchy and registry rendering.
- Modify `src/app/globals.css`
  - Responsibility: Existing global admin primitives. Add route-specific `.payment-*` classes for responsive payment composer and registry rows. Do not alter public proof or advisor styles.
- Modify `tests/e2e/admin-approval-feedback.spec.ts`
  - Responsibility: Browser-level proof that `/admin/batches` exposes the composer first, status/actions without horizontal scrolling, and existing create/sync flows still work.
- Modify `tests/ayra-admin-batch-form.test.ts`
  - Responsibility: Source-level regression guard that the admin payments page no longer uses the broken two-column registry/table pattern.

## Current Problems To Preserve In Tests

- The current page places `Batch registry` and `Create one-line payment` inside a `grid-2`, so the registry only gets half the content width.
- The registry table uses `min-w-[760px]` inside `overflow-x-auto`, so status and SDP actions can fall off-screen.
- Long SDP IDs and hashes are primary table contents even though the operator first needs state and next action.
- The line-item and reconciliation audit tables may remain horizontally scrollable in this plan; the P0 problem is the primary batch registry workflow.

## Target UX Contract

- Composer appears before registry in DOM and visually.
- Composer is full width and keeps existing initiative selector, payout preview, currency conversion, receipt input, and submit button behavior.
- Registry appears below composer as a full-width operational queue.
- Every visible batch row exposes payment identity, amount, status, and the available action or proof state without horizontal scrolling.
- Technical proof references wrap inside secondary detail areas and never set the minimum row width.
- No new dependencies.
- No backend/domain/server-action behavior changes.

---

### Task 1: Add Regression Tests For The Payment Workflow Layout

**Files:**
- Modify: `tests/e2e/admin-approval-feedback.spec.ts`
- Modify: `tests/ayra-admin-batch-form.test.ts`

- [ ] **Step 1: Add a Playwright test that fails on the current horizontal-scroll registry**

Append this test to `tests/e2e/admin-approval-feedback.spec.ts`:

```ts
test("admin payments keeps batch status and actions visible without horizontal scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/admin/batches");

  const composer = page.locator('[data-admin-payments-section="composer"]');
  const registry = page.locator('[data-admin-payments-section="registry"]');

  await expect(composer).toBeVisible();
  await expect(registry).toBeVisible();
  await expect(composer).toHaveJSProperty("offsetTop", 104);
  await expect(registry).toHaveJSProperty("offsetTop", 716);

  const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(pageOverflow).toBe(false);

  const registryOverflow = await registry.evaluate(
    (element) => element.scrollWidth > element.clientWidth,
  );
  expect(registryOverflow).toBe(false);

  const firstBatchRow = registry.locator('[data-payment-registry-row]').first();
  await expect(firstBatchRow.getByText(/PV-REFOR|PV-REFOREST/)).toBeVisible();
  await expect(firstBatchRow.getByText(/settled|submitted|ready/i).first()).toBeVisible();
  await expect(
    firstBatchRow.getByRole("button", { name: /Submit|Sync status/ }).or(
      firstBatchRow.getByRole("link", { name: /Verify on Stellar Expert/ }),
    ),
  ).toBeVisible();
});
```

- [ ] **Step 2: Correct the offset assertions to relative ordering instead of hard-coded pixels**

Replace the two `toHaveJSProperty("offsetTop", ...)` assertions from Step 1 with this code:

```ts
const composerTop = await composer.evaluate((element) => element.getBoundingClientRect().top);
const registryTop = await registry.evaluate((element) => element.getBoundingClientRect().top);
expect(composerTop).toBeLessThan(registryTop);
```

- [ ] **Step 3: Add a mobile-width overflow check**

Append this test to `tests/e2e/admin-approval-feedback.spec.ts`:

```ts
test("admin payments registry adapts on mobile width without hiding actions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/batches");

  const registry = page.locator('[data-admin-payments-section="registry"]');
  await expect(registry).toBeVisible();

  const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(pageOverflow).toBe(false);

  const firstBatchRow = registry.locator('[data-payment-registry-row]').first();
  await expect(firstBatchRow).toBeVisible();
  await expect(firstBatchRow.getByText(/settled|submitted|ready/i).first()).toBeVisible();
  await expect(
    firstBatchRow.getByRole("button", { name: /Submit|Sync status/ }).or(
      firstBatchRow.getByRole("link", { name: /Verify on Stellar Expert/ }),
    ),
  ).toBeVisible();
});
```

- [ ] **Step 4: Update existing copy expectations to match the current UI label**

In `tests/e2e/admin-approval-feedback.spec.ts`, replace every existing `"Create one-line batch"` text expectation with `"Create one-line payment"` and every `"Create ready batch"` button expectation inside the one-line payment composer with `"Create ready payment"`.

The changed assertions should read:

```ts
await expect(page.getByText("Create one-line payment")).toBeVisible();
const composer = page
  .locator("form")
  .filter({ hasText: "Create one-line payment" });
```

and:

```ts
await expect(
  composer.getByRole("button", { name: "Create ready payment" }),
).toBeDisabled();
```

- [ ] **Step 5: Add a source-level guard against the broken layout pattern**

Append this test inside the existing `describe("AYRA admin batch form", () => { ... })` block in `tests/ayra-admin-batch-form.test.ts`:

```ts
it("renders the payments composer before a non-scroll batch registry", () => {
  const source = readFileSync("src/app/admin/batches/page.tsx", "utf8");

  const composerIndex = source.indexOf('data-admin-payments-section="composer"');
  const registryIndex = source.indexOf('data-admin-payments-section="registry"');

  assert.ok(composerIndex > -1, "composer section marker should exist");
  assert.ok(registryIndex > -1, "registry section marker should exist");
  assert.ok(
    composerIndex < registryIndex,
    "composer should appear before registry in the admin payments page",
  );
  assert.doesNotMatch(
    source,
    /<div className="grid-2">\s*<div className="panel overflow-x-auto">\s*<div className="panel-head">\s*<span className="panel-title">Batch registry<\/span>/s,
  );
  assert.doesNotMatch(source, /<table className="t min-w-\[760px\]">\s*<thead>\s*<tr>\s*<th>Payment<\/th>\s*<th>Amount<\/th>\s*<th>Status<\/th>\s*<th>SDP<\/th>/s);
});
```

- [ ] **Step 6: Run focused tests and confirm failure**

Run:

```bash
npx tsx --test tests/ayra-admin-batch-form.test.ts
npm run test:e2e -- tests/e2e/admin-approval-feedback.spec.ts --grep "admin payments"
```

Expected:

```text
FAIL tests/ayra-admin-batch-form.test.ts
composer section marker should exist

FAIL tests/e2e/admin-approval-feedback.spec.ts
locator('[data-admin-payments-section="composer"]') not found
```

- [ ] **Step 7: Commit the failing regression tests**

```bash
git add tests/e2e/admin-approval-feedback.spec.ts tests/ayra-admin-batch-form.test.ts
git commit -m "test: cover admin payments responsive workflow"
```

---

### Task 2: Reorder The Admin Payments Page Into Composer Then Registry

**Files:**
- Modify: `src/app/admin/batches/page.tsx`
- Test: `tests/ayra-admin-batch-form.test.ts`

- [ ] **Step 1: Replace the top `grid-2` wrapper with a vertical payments layout**

In `src/app/admin/batches/page.tsx`, replace the opening layout at the current `grid-2` block:

```tsx
        <div className="grid-2">
          <div className="panel overflow-x-auto">
            <div className="panel-head">
              <span className="panel-title">Batch registry</span>
            </div>
            <table className="t min-w-[760px]">
```

with:

```tsx
        <div className="admin-payments-stack">
          <form
            action={createBatchAction}
            className="panel payment-composer"
            data-admin-payments-section="composer"
          >
            <div className="panel-head">
              <span className="panel-title">Create one-line payment</span>
              <Chip>Manual v1</Chip>
            </div>
            <div className="panel-body grid gap-4">
              <BatchInitiativeTarget
                defaultInitiativeId={view.reforest.id}
                rateAvailable={Boolean(view.usdCopRate)}
                targets={batchTargets}
              >
                {view.defaultSponsor ? (
                  <input name="sponsorId" type="hidden" value={view.defaultSponsor.id} />
                ) : null}
                <div className="grid-2">
                  <div className="field">
                    <label htmlFor="code">Payment reference label</label>
                    <input id="code" name="code" defaultValue={suggestedBatchCode} />
                  </div>
                  <div className="field">
                    <label htmlFor="periodLabel">Period</label>
                    <input id="periodLabel" name="periodLabel" defaultValue="May 2026" />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="category">Category</label>
                  <input id="category" name="category" defaultValue="Crew wages" />
                </div>
                {view.usdCopRate ? (
                  <BatchCurrencyFields
                    defaultAmountUsdc={3600}
                    rateUpdatedAt={view.usdCopRate.updatedAt}
                    usdCopRate={view.usdCopRate.rate}
                  />
                ) : (
                  <div
                    className="border border-rule bg-[var(--ops-surface)] px-4 py-3 text-sm text-ink-muted"
                    role="status"
                  >
                    Daily USD/COP rate unavailable. Payment creation is paused until
                    the market-rate source is reachable.
                  </div>
                )}
                <div className="field">
                  <label htmlFor="receiptFile">Private receipt</label>
                  <input id="receiptFile" name="receiptFile" type="file" />
                </div>
              </BatchInitiativeTarget>
            </div>
          </form>

          <div
            className="panel payment-registry"
            data-admin-payments-section="registry"
          >
            <div className="panel-head">
              <span className="panel-title">Batch registry</span>
            </div>
            <div className="payment-registry-list">
```

- [ ] **Step 2: Remove the old composer form block from below the registry**

Delete the old form block that starts with:

```tsx
          <form action={createBatchAction} className="panel">
```

and ends with:

```tsx
          </form>
        </div>
```

After deletion, the top layout should end with the new registry panel and a single closing `</div>` for `admin-payments-stack`.

- [ ] **Step 3: Temporarily keep the old registry table inside the new registry panel**

Inside the new `<div className="payment-registry-list">`, keep the current table body only long enough to avoid breaking compilation during this task:

```tsx
              <table className="t min-w-[760px]">
                <thead>
                  <tr>
                    <th>Payment</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>SDP</th>
                  </tr>
                </thead>
                <tbody>
                  {session.state.batches.map((batch) => {
                    const settledTransactionHashes = session.state.batchLineItems
                      .filter(
                        (line) =>
                          line.batchId === batch.id &&
                          line.status === "settled" &&
                          line.transactionHash,
                      )
                      .map((line) => line.transactionHash!);

                    return (
                      <tr key={batch.id}>
                        <td>
                          <div className="row-name">{batch.code}</div>
                          <div className="row-meta">
                            {batch.periodLabel} · {batch.initiativeId}
                          </div>
                        </td>
                        <td>
                          <Money amount={batchTotal(session.state, batch.id)} />
                        </td>
                        <td>
                          <Chip tone={batch.status === "settled" ? "ok" : "info"}>
                            {batch.status}
                          </Chip>
                        </td>
                        <td>
                          {batch.status === "ready" ? (
                            <form action={submitBatchAction}>
                              <input name="batchId" type="hidden" value={batch.id} />
                              <button className="btn primary" type="submit">
                                Submit <Send className="h-4 w-4" />
                              </button>
                            </form>
                          ) : batch.status === "submitted" ? (
                            <form action={syncBatchStatusAction}>
                              <input name="batchId" type="hidden" value={batch.id} />
                              <button className="btn" type="submit">
                                Sync status
                              </button>
                            </form>
                          ) : (
                            <div className="grid gap-1">
                              <span className="text-xs uppercase text-ink-muted">SDP payment</span>
                              <Hash
                                pendingLabel="Provider payment reference recorded"
                                value={batch.sdpBatchId}
                              />
                              <span className="mt-2 text-xs uppercase text-ink-muted">
                                Explorer verification
                              </span>
                              {settledTransactionHashes.length > 0 ? (
                                settledTransactionHashes.map((transactionHash) => (
                                  <StellarTransactionVerificationLink
                                    key={transactionHash}
                                    transactionHash={transactionHash}
                                  />
                                ))
                              ) : (
                                <StellarTransactionVerificationLink />
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
```

- [ ] **Step 4: Run the source-level test and confirm partial progress**

Run:

```bash
npx tsx --test tests/ayra-admin-batch-form.test.ts
```

Expected:

```text
FAIL tests/ayra-admin-batch-form.test.ts
renders the payments composer before a non-scroll batch registry
```

The marker and order assertions should pass; the old table pattern assertion should still fail until Task 3.

- [ ] **Step 5: Commit the page order change**

```bash
git add src/app/admin/batches/page.tsx
git commit -m "refactor: place admin payment composer before registry"
```

---

### Task 3: Replace The Batch Registry Table With Responsive Operational Rows

**Files:**
- Modify: `src/app/admin/batches/page.tsx`
- Test: `tests/ayra-admin-batch-form.test.ts`
- Test: `tests/e2e/admin-approval-feedback.spec.ts`

- [ ] **Step 1: Replace the registry table with row markup**

In `src/app/admin/batches/page.tsx`, replace the entire table inside:

```tsx
            <div className="payment-registry-list">
```

with:

```tsx
              {session.state.batches.map((batch) => {
                const settledTransactionHashes = session.state.batchLineItems
                  .filter(
                    (line) =>
                      line.batchId === batch.id &&
                      line.status === "settled" &&
                      line.transactionHash,
                  )
                  .map((line) => line.transactionHash!);
                const isSettled = batch.status === "settled";
                const isSubmitted = batch.status === "submitted";
                const isReady = batch.status === "ready";

                return (
                  <article
                    className="payment-registry-row"
                    data-payment-registry-row
                    key={batch.id}
                  >
                    <div className="payment-registry-main">
                      <div className="payment-registry-identity">
                        <div className="row-name break-words">{batch.code}</div>
                        <div className="row-meta">
                          {batch.periodLabel} · {batch.initiativeId}
                        </div>
                      </div>
                      <div className="payment-registry-amount">
                        <span className="payment-registry-label">Amount</span>
                        <Money amount={batchTotal(session.state, batch.id)} />
                      </div>
                      <div className="payment-registry-status">
                        <span className="payment-registry-label">Status</span>
                        <Chip tone={isSettled ? "ok" : "info"}>{batch.status}</Chip>
                      </div>
                    </div>

                    <div className="payment-registry-action">
                      {isReady ? (
                        <form action={submitBatchAction}>
                          <input name="batchId" type="hidden" value={batch.id} />
                          <button className="btn primary" type="submit">
                            Submit <Send className="h-4 w-4" />
                          </button>
                        </form>
                      ) : isSubmitted ? (
                        <form action={syncBatchStatusAction}>
                          <input name="batchId" type="hidden" value={batch.id} />
                          <button className="btn" type="submit">
                            Sync status
                          </button>
                        </form>
                      ) : settledTransactionHashes.length > 0 ? (
                        settledTransactionHashes.map((transactionHash) => (
                          <StellarTransactionVerificationLink
                            key={transactionHash}
                            transactionHash={transactionHash}
                          />
                        ))
                      ) : (
                        <StellarTransactionVerificationLink />
                      )}
                    </div>

                    <div className="payment-registry-proof">
                      <span className="payment-registry-label">Provider payment reference</span>
                      <Hash
                        pendingLabel="Provider payment reference recorded"
                        value={batch.sdpBatchId}
                      />
                    </div>
                  </article>
                );
              })}
```

- [ ] **Step 2: Run the source-level test**

Run:

```bash
npx tsx --test tests/ayra-admin-batch-form.test.ts
```

Expected:

```text
PASS tests/ayra-admin-batch-form.test.ts
```

- [ ] **Step 3: Run the Playwright admin payments tests and confirm CSS failure**

Run:

```bash
npm run test:e2e -- tests/e2e/admin-approval-feedback.spec.ts --grep "admin payments"
```

Expected:

```text
FAIL tests/e2e/admin-approval-feedback.spec.ts
```

The failure may be horizontal overflow or action visibility because CSS classes do not exist yet.

- [ ] **Step 4: Commit the registry markup change**

```bash
git add src/app/admin/batches/page.tsx tests/ayra-admin-batch-form.test.ts
git commit -m "refactor: render admin payments as action rows"
```

---

### Task 4: Add Responsive Styling For Composer And Registry Rows

**Files:**
- Modify: `src/app/globals.css`
- Test: `tests/e2e/admin-approval-feedback.spec.ts`

- [ ] **Step 1: Add route-local payment layout CSS**

In `src/app/globals.css`, insert the following after the existing `.panel-body` rule:

```css
.admin-payments-stack {
  display: grid;
  gap: 16px;
}

.payment-composer {
  overflow: clip;
}

.payment-registry {
  overflow: clip;
}

.payment-registry-list {
  display: grid;
}

.payment-registry-row {
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(0, 1fr) minmax(160px, auto);
  padding: 14px 16px;
}

.payment-registry-row + .payment-registry-row {
  border-top: 1px solid var(--rule);
}

.payment-registry-main {
  align-items: start;
  display: grid;
  gap: 14px;
  grid-template-columns: minmax(220px, 1fr) minmax(88px, auto) minmax(92px, auto);
  min-width: 0;
}

.payment-registry-identity,
.payment-registry-amount,
.payment-registry-status,
.payment-registry-proof,
.payment-registry-action {
  min-width: 0;
}

.payment-registry-amount,
.payment-registry-status {
  display: grid;
  gap: 5px;
}

.payment-registry-action {
  align-items: start;
  display: flex;
  justify-content: end;
}

.payment-registry-action .btn {
  white-space: nowrap;
}

.payment-registry-proof {
  display: grid;
  gap: 5px;
  grid-column: 1 / -1;
}

.payment-registry-label {
  color: var(--ink-muted);
  display: block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}
```

- [ ] **Step 2: Add tablet/mobile adaptation**

In `src/app/globals.css`, inside the existing `@media (max-width: 900px)` block, after the `.section-head` rule, add:

```css
  .payment-registry-row {
    grid-template-columns: 1fr;
  }

  .payment-registry-main {
    grid-template-columns: minmax(0, 1fr) minmax(82px, auto);
  }

  .payment-registry-status {
    justify-items: end;
  }

  .payment-registry-action {
    justify-content: start;
  }
```

- [ ] **Step 3: Add narrow-phone adaptation**

In `src/app/globals.css`, after the existing `@media (max-width: 900px)` block closes, add:

```css
@media (max-width: 520px) {
  .payment-registry-row {
    padding: 13px 12px;
  }

  .payment-registry-main {
    grid-template-columns: 1fr;
  }

  .payment-registry-status {
    justify-items: start;
  }

  .payment-registry-action .btn,
  .payment-registry-action form {
    width: 100%;
  }
}
```

- [ ] **Step 4: Run the Playwright admin payments tests**

Run:

```bash
npm run test:e2e -- tests/e2e/admin-approval-feedback.spec.ts --grep "admin payments"
```

Expected:

```text
PASS tests/e2e/admin-approval-feedback.spec.ts
```

- [ ] **Step 5: Commit the responsive CSS**

```bash
git add src/app/globals.css
git commit -m "style: prevent admin payments horizontal scroll"
```

---

### Task 5: Preserve Existing Admin Batch Behavior And Polish Labels

**Files:**
- Modify: `src/app/admin/batches/page.tsx`
- Modify: `tests/e2e/admin-approval-feedback.spec.ts`

- [ ] **Step 1: Make registry proof labels operator-centered**

In `src/app/admin/batches/page.tsx`, replace:

```tsx
<span className="payment-registry-label">Provider payment reference</span>
```

with:

```tsx
<span className="payment-registry-label">Payment provider reference</span>
```

- [ ] **Step 2: Keep line-item and reconciliation audit sections below the primary workflow**

No code change is required if the line item panel still appears after the top `admin-payments-stack`. Verify the top-level order in `src/app/admin/batches/page.tsx` is:

```tsx
<div className="admin-payments-stack">
  <form data-admin-payments-section="composer" ...>
  ...
  </form>

  <div data-admin-payments-section="registry" ...>
  ...
  </div>
</div>

<div className="panel mt-4 overflow-x-auto">
  ...
</div>

<div className="panel mt-4 overflow-x-auto">
  ...
</div>
```

- [ ] **Step 3: Run all admin feedback E2E tests**

Run:

```bash
npm run test:e2e -- tests/e2e/admin-approval-feedback.spec.ts
```

Expected:

```text
PASS tests/e2e/admin-approval-feedback.spec.ts
```

- [ ] **Step 4: Run the focused unit/source tests**

Run:

```bash
npx tsx --test tests/ayra-admin-batch-form.test.ts
```

Expected:

```text
PASS tests/ayra-admin-batch-form.test.ts
```

- [ ] **Step 5: Run lint**

Run:

```bash
npm run lint
```

Expected:

```text
No ESLint errors for src/app/admin/batches/page.tsx, src/app/globals.css, tests/e2e/admin-approval-feedback.spec.ts, or tests/ayra-admin-batch-form.test.ts.
```

- [ ] **Step 6: Commit the copy and verification pass**

```bash
git add src/app/admin/batches/page.tsx tests/e2e/admin-approval-feedback.spec.ts
git commit -m "test: verify admin payment registry workflow"
```

---

### Task 6: Browser Verification And Final Audit

**Files:**
- No source changes expected.
- Evidence target: `/admin/batches`

- [ ] **Step 1: Start the local app**

Run:

```bash
npm run dev
```

Expected:

```text
▲ Next.js
Local: http://localhost:3000
```

If port 3000 is occupied, use the printed alternate port in every browser step below.

- [ ] **Step 2: Verify desktop layout manually or with Browser**

Open:

```text
http://localhost:3000/admin/batches
```

Expected visible order:

```text
Payments
Create one-line payment
Batch registry
PV-... payment rows with amount, status, and Submit/Sync/Verify action visible
```

Expected negative observation:

```text
No horizontal scrollbar on the browser window or the Batch registry panel at 1024px width.
```

- [ ] **Step 3: Verify mobile layout manually or with Browser**

Set viewport to `390x844` and open:

```text
http://localhost:3000/admin/batches
```

Expected visible behavior:

```text
Composer appears before registry.
Each registry row stacks identity, amount/status, action, and provider reference.
Submit/Sync/Verify is visible without sideways scroll.
No page-level horizontal scrollbar.
```

- [ ] **Step 4: Re-run the audit checklist**

Use this scoring target:

```text
Accessibility: 3 or higher
Performance: 3 or higher
Theming: 3 or higher
Responsive Design: 3 or higher
Anti-Patterns: 3 or higher
Total: 15/20 or higher
```

- [ ] **Step 5: Commit final verification notes only if a tracked artifact was added**

If no screenshots or notes were added, do not commit. If a compact verification note is added under `agentic/`, commit it with:

```bash
git add agentic/<verification-note>.md
git commit -m "docs: record admin payments layout verification"
```

---

## Self-Review

Spec coverage:
- Composer first: Task 2.
- Batch registry below composer: Task 2.
- No horizontal scroll for primary status/actions: Tasks 1, 3, and 4.
- Status/action visibility: Tasks 1, 3, and 4.
- Keep backend/server actions unchanged: File structure and Tasks 2-5.
- Operator-centered labels: Task 5.
- Browser verification: Task 6.

Placeholder scan:
- No banned placeholder phrases or vague edge-case instructions remain.
- Every code-changing task includes concrete snippets.
- Every test task includes exact commands and expected outcomes.

Type consistency:
- Data markers are consistently `data-admin-payments-section="composer"`, `data-admin-payments-section="registry"`, and `data-payment-registry-row`.
- CSS classes are consistently `.admin-payments-stack`, `.payment-composer`, `.payment-registry`, `.payment-registry-list`, `.payment-registry-row`, `.payment-registry-main`, `.payment-registry-action`, `.payment-registry-proof`, and `.payment-registry-label`.
- Existing server actions and components keep their current names.
