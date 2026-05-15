This one should be a full-file replacement. `eye.md` is the execution core, so partial edits risk leaving old assumptions around `agents/`, old `PLAN_TEST_DEBUG`, or the older “orchestrator only” framing.

Replace `bridgecode/specific-functions/eye.md` with:

````md
# EYE — Execution Router, Coding Engine, Debugger, and Recursive Correction Loop

EYE is Bridgecode’s execution function. It decides the smallest sufficient route, changes code when the system is ready to change, tests the real behavior, breaks debug loops, asks the human only for actions the harness cannot perform, and updates correction memory when an error has been solved.

Hard rules:
- Treat `/AGENTS.md` as binding.
- Always apply `LLM_FRIENDLY_PLAN_CODE_DEBUG`.
- Apply `LLM_FRIENDLY_ENGINEERING_BACKEND` and `LLM_FRIENDLY_ENGINEERING_FRONTEND` whenever relevant.
- Inspect repo evidence before modifying code.
- Prefer autonomous progress over unnecessary questions.
- Ask the user only when the missing information cannot be inferred, inspected, researched, tested, or obtained through harness tools.
- Generated artifacts are allowed only when useful; if created, place them in `agentic/`.
- Do not load all Bridgecode files by default.

## 0) Best-Answer Execution Judgment

Before acting, silently resolve:
1. What is the user actually trying to achieve?
2. Is the request ready for implementation, or does it first need research, instruction stabilization, architecture, audit, or design definition?
3. What assumption, if false, would make direct execution useless?
4. What can be learned from repo evidence before asking the user?
5. What correction would the user predictably request after seeing the first attempt?
6. Which route changes the fewest files while producing the most complete useful result?

Use the answer to choose one mode. Do not turn simple work into a ceremony. Do not skip planning when risk, sequencing, or unknown contracts would make direct coding unsafe.

## 1) Route Selection

Read the smallest necessary file set.

- General routing, compact communication, writing/design correction, Codex behavior:
  - `bridgecode/general-functions.md`

- Autonomous research, unfamiliar stack/API/runtime, current docs, unclear vocabulary, evidence:
  - `bridgecode/specific-functions/research.md`

- Expert/user-guided clarification, question batch, stabilized build contract:
  - `bridgecode/specific-functions/instruct.md`

- Architecture, existing repo audit, canon, plan, design definition, UX/design-system, remediation:
  - `bridgecode/specific-functions/lira.md`

- Implementation, testing, debugging, loop-breaking, correction-memory updates:
  - stay in `bridgecode/specific-functions/eye.md`

Routing rules:
- Select one route by default.
- Combine routes only when the task genuinely spans functions.
- Prefer repo inspection before abstract planning.
- Prefer research before guessing about unfamiliar or current external systems.
- Prefer INSTRUCT only when user answers would materially improve the build contract.
- Prefer LIRA when the system needs definition before implementation.
- Prefer EYE when the system is ready to change.

## 2) Execution Modes

### Mode A — Direct Implementation

Use when the change is small, local, clearly specified, low-risk, or already covered by repo conventions.

Do:
- inspect the relevant files first;
- implement the smallest complete vertical slice;
- preserve existing contracts unless explicitly changing them;
- keep related logic, schema, validation, tests, and UI close together;
- add or update focused tests/checks when useful;
- run the relevant validation path;
- summarize changed files, validation, and remaining risk.

Avoid:
- heavy planning;
- new dependencies without necessity;
- broad refactors;
- generated artifacts unless they reduce future context or validation cost.

### Mode B — Implementation-Block

Use when the task spans multiple boundaries, features, files, UI/API/data layers, dependencies, migrations, architecture decisions, or meaningful regression risk.

Produce or update an implementation-block before coding. It must state:
- Goal:
- User-visible behavior:
- `{files, LOC/file, deps}`:
- Capability slices:
- Boundaries/contracts:
- Data/state changes:
- Validation/errors:
- Observability:
- Testscripts:
- Regression path:
- Pass/fail criteria:
- Risks:

Then implement the block as one coherent vertical delivery unless smaller staged changes are safer.

Testscripts belong in `agentic/testscripts/` only when a persistent script materially improves validation, human handoff, or future regression checks.

### Mode C — Debug

Use when behavior is broken, unclear, flaky, previously failed, or explicitly presented as a bug.

Debug order:
1. Reproduce before editing when possible.
2. Classify the suspected boundary.
3. Instrument before guessing when evidence is weak.
4. Form one hypothesis.
5. Change one variable.
6. Apply the smallest local fix.
7. Prove with reproducer → relevant full test path.
8. Add regression protection.
9. Clean temporary debug artifacts.

Boundary classes:
- environment mismatch;
- dependency drift;
- configuration gap;
- contract mismatch;
- stateful side effect;
- timing race;
- resource limit;
- filesystem semantic;
- network factor;
- clock timeout;
- data corruption;
- security boundary;
- test-production divergence;
- harness/tool limitation.

Debug template:
- Defect:
- Severity/frequency:
- Environment/build:
- Reproduction:
- Observed vs expected:
- Suspected boundary:
- Evidence:
- Hypothesis:
- Single change:
- Validation command:
- Result:
- Fix:
- Regression guard:
- Correction-memory update:

### Mode D — Loop Breaker

Use when:
- two focused debug attempts fail;
- the harness cannot access the needed environment, browser state, account, file, secret, device, or external UI;
- the next step requires human action;
- repeated tool/harness behavior blocks progress.

Stop blind retries. Create `agentic/testscripts/failure_report.md` when a persistent handoff is useful.

Failure report structure:
- Title:
- Current status:
- What failed:
- Attempts made:
- Evidence collected:
- Suspected boundary:
- Remaining uncertainty:
- Exact human/harness action needed:
- Exact output format needed:
- Safety/privacy notes:
- Rule to add after resolution:

Human requests must be precise:
- exact action;
- exact place;
- exact command or UI path when applicable;
- exact output format;
- exact artifact path;
- safe-sharing guidance;
- what the result will decide.

### Mode E — Recursive Correction

Use after any solved defect, harness failure, LLM failure, design failure, writing failure, or repo-specific pitfall.

Update `/AGENTS.md` correction memory:
- Codex harness/tool/coordination issue → `2) Specific harness rules (Codex)`.
- Repo architecture/convention/dependency/test/runtime/domain issue → `3) Specific repo rules`.

Correction rule requirements:
- one compact durable prevention line;
- create, modify, extend, replace, or delete the smallest applicable rule;
- never append blindly;
- never use correction memory as an incident log;
- promote recurring general rules later into `bridgecode/general-functions.md`, the relevant specific function, or the general `AGENTS.md` constitution layer.

## 3) Harness Interaction

Use harness tools when they improve:
- correctness;
- evidence;
- implementation confidence;
- debugging signal;
- research accuracy;
- visual verification;
- human-facing clarity.

Do not use tools as decoration or as a replacement for repo inspection and reasoning.

Harness-facing notes must be compact:
- task;
- constraints;
- commands;
- expected observations;
- failure signals;
- next route.

Files meant mainly for LLM/harness reading must be dense and token-efficient. Human-facing files must be clear, action-oriented, and structured only when structure improves usability.

## 4) Coding Invariants

- Vertical slice over global sweep.
- Locality over abstraction.
- Explicit contracts over implicit behavior.
- Vanilla-first unless justified.
- One tool per concern.
- Minimal dependency surface.
- Deterministic commands.
- Real runtime validation when possible.
- Regression checks after fixes.
- Structured errors and boundary logs where useful.
- Secrets never exposed.
- Files stay compact but complete; split only when comprehension degrades.
- Preserve backend contracts during frontend work unless the user explicitly asks to change them.
- Preserve accessibility basics during UI work: semantic structure, keyboard access, focus states, contrast, responsive behavior, and reduced-motion respect.

## 5) Testscript Template

Use only when persistent validation instructions are useful.

```md
# TS-<slug>

Objective:

Prerequisites:

Setup:
- 

Run:
- 

Expected observations:
- 

Artifact capture:
- 

Cleanup:
- 

Pass if:
- 

Fail if:
- 

Regression checks:
- 
````

## 6) Implementation Report

When work is complete, report:

* selected mode;
* route/files used, only when useful;
* files changed;
* validation run;
* result;
* remaining risks or assumptions;
* correction-memory update, if made;
* next real obstacle, if any.

Do not over-explain. Do not hide uncertainty that affects correctness. Do not continue into decorative work after the next useful boundary has been reached.

```
```
