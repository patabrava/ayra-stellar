# AYRA Advisor Founder Voice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public AYRA advisor chat more talkative, visionary, movement-building, warm, community-first, and lightly ideological while preserving source-grounding, privacy, and proof discipline.

**Architecture:** This is a prompt-contract change inside the existing advisor vertical slice. The generated Gemini prompt will carry the new founder/operator voice instructions, and the existing prompt unit test will become the regression guard. No UI, API schema, Gemini transport, fallback-answer logic, or data-source behavior changes are needed for this pass.

**Tech Stack:** Next.js App Router, TypeScript, Node test runner, existing AYRA advisor source and prompt functions.

---

## File Structure

- Modify: `src/lib/ayra/advisor.ts`
  - Responsibility: Builds the source-grounded system prompt for the public advisor and preserves the existing AYRA privacy, approval-state, funding, Stellar proof, and citation rules.
- Modify: `tests/ayra-advisor.test.ts`
  - Responsibility: Verifies the generated prompt includes the new voice constraints while retaining source IDs, privacy rules, approval-list behavior, history, and compact prompt length.

Do not create new files, dependencies, UI components, migrations, or generated artifacts. `{files, LOC/file, deps}`: 2 modified files, about +8 to +16 LOC in each file, 0 dependencies.

### Task 1: Add Founder-Voice Prompt Contract Test

**Files:**
- Modify: `tests/ayra-advisor.test.ts`
- Test: `tests/ayra-advisor.test.ts`

- [ ] **Step 1: Update the existing prompt contract test with voice assertions**

In `tests/ayra-advisor.test.ts`, find the test named:

```ts
it("builds a compact prompt that includes source IDs and privacy rules", () => {
```

Inside that test, replace this assertion:

```ts
    assert.match(prompt, /Warm, conversational tone/i);
```

with these assertions:

```ts
    assert.match(prompt, /founder-operator voice/i);
    assert.match(prompt, /visionary and movement-building/i);
    assert.match(prompt, /warm, charismatic, and community-first/i);
    assert.match(prompt, /principled and lightly ideological/i);
    assert.match(prompt, /Do not use crypto hype/i);
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
npm test -- tests/ayra-advisor.test.ts
```

Expected: FAIL in `builds a compact prompt that includes source IDs and privacy rules` because the prompt does not yet contain `founder-operator voice`, `visionary and movement-building`, `warm, charismatic, and community-first`, `principled and lightly ideological`, or `Do not use crypto hype`.

### Task 2: Update the Public Advisor System Prompt

**Files:**
- Modify: `src/lib/ayra/advisor.ts`
- Test: `tests/ayra-advisor.test.ts`

- [ ] **Step 1: Replace the current tone line with founder-voice instructions**

In `src/lib/ayra/advisor.ts`, inside `buildAdvisorPrompt()`, replace this line:

```ts
    "Warm, conversational tone: sound like a clear human guide, not a database. Use short paragraphs, explain terms plainly, and connect facts into a useful answer.",
```

with these lines:

```ts
    "Use a founder-operator voice: visionary and movement-building, warm, charismatic, and community-first.",
    "Be more talkative than a database answer: use short connected paragraphs, explain why the facts matter, and help the reader feel the civic momentum behind AYRA.",
    "You may sound principled and lightly ideological about public accountability, local adoption, open proof, and community-owned progress.",
    "Do not use crypto hype, cultish language, exaggerated certainty, or claims that the source pack does not prove.",
```

- [ ] **Step 2: Run the focused unit test to verify it passes**

Run:

```bash
npm test -- tests/ayra-advisor.test.ts
```

Expected: PASS. The prompt contract should still include:

```txt
SOURCE ID: ayra:approved-projects
SOURCE ID: ayra:north-star
SOURCE ID: funding:providencia:reforestation
SOURCE ID: stellar:providencia:reforestation
Do not reveal private contacts
approved-projects source
live and funding are the public approval statuses
Conversation history:
Question: What is the public approval list?
```

- [ ] **Step 3: Run the relevant E2E advisor smoke if local Playwright browsers are available**

Run:

```bash
npm run test:e2e -- tests/e2e/ayra-advisor.spec.ts
```

Expected: PASS. This verifies the public advisor panel still opens and answers public funding and Stellar questions through the deterministic fallback path.

If Playwright browsers or the local dev server fail for an environment reason, do not broaden the code change. Record the exact error in the implementation summary and keep the unit test as the required validation.

- [ ] **Step 4: Review the exact diff before staging**

Run:

```bash
git diff -- src/lib/ayra/advisor.ts tests/ayra-advisor.test.ts
```

Expected: The diff only changes the prompt tone instructions and prompt-contract assertions. It must not change fallback answer text, API behavior, source selection, privacy filters, approval-state rules, Stellar proof logic, or UI copy.

- [ ] **Step 5: Commit only the scoped files**

Run:

```bash
git add src/lib/ayra/advisor.ts tests/ayra-advisor.test.ts
git commit -m "feat: tune ayra advisor founder voice"
```

Expected: A commit containing only `src/lib/ayra/advisor.ts` and `tests/ayra-advisor.test.ts`. If the worktree has unrelated user changes, do not stage or revert them.

## Self-Review

Spec coverage: The plan covers the requested public advisor chat agent, a more talkative tone, visionary and movement-building energy, warm charismatic community language, and a more provocative ideological stance. It also preserves the safety constraint that the advisor must not invent facts or expose private data.

Placeholder scan: Clean. No task uses deferred implementation language or unspecified test behavior.

Type consistency: The plan uses existing functions and files only: `buildAdvisorPrompt`, `buildAdvisorSources`, `createDemoState`, `tests/ayra-advisor.test.ts`, and `src/lib/ayra/advisor.ts`.

Scope check: This is one vertical prompt-contract update, not multiple subsystems. No separate sub-project plans are needed.
