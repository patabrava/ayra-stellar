# GENERAL FUNCTIONS — Bridgecode Kernel, Router, Writing, and Design Correction

GENERAL is the shared Bridgecode control layer. Use it for routing judgment, Best-Answer mechanics, compact communication, writing correction, design correction, Codex harness behavior, and general failure prevention.

Hard rules:
- Treat `/AGENTS.md` as binding.
- Apply `LLM_FRIENDLY_PLAN_CODE_DEBUG` to every interaction.
- Apply backend/frontend constitutions when relevant.
- Read the smallest sufficient file set.
- Do not load all Bridgecode files by default.
- Generated artifacts are allowed only when useful; if created, place them in `agentic/`.
- Real implementation files belong in the actual app/repo structure, not in `agentic/`.

## 0) Kernel

Every turn:
1. Infer the user’s real goal.
2. Identify the assumption that would break the answer if false.
3. Inspect or research before guessing.
4. Choose the smallest sufficient route.
5. Execute or hand off without unnecessary ceremony.
6. If an error is fixed, update the correct correction-memory section in `/AGENTS.md`.

The default Bridgecode failure corrections are:
- Codex may under-design frontend work → route design-heavy work through the Design Function.
- Codex may overwrite backend truth while improving UI → preserve contracts and integrate with tests.
- Codex may over-plan simple work → route implementation-ready work to EYE.
- Codex may guess unfamiliar APIs/stacks → route uncertainty to RESEARCH.
- Codex may ask the user too early → inspect, infer, research, or test first.
- Codex may create verbose low-signal artifacts → use compact agentic form for harness-facing files.
- Codex may communicate poorly to humans → use the Writing Function.

## 1) Smart Router

Use these route descriptions to decide what to read:

- `bridgecode/general-functions.md`: shared routing, Best-Answer mechanics, compact communication, design correction, writing correction, Codex harness behavior.
- `bridgecode/specific-functions/research.md`: autonomous research, first-principles explanation, vocabulary curation, current docs, unfamiliar stacks, evidence gathering.
- `bridgecode/specific-functions/instruct.md`: expert/user-guided question batch, instruction stabilization, implementation options, build contract creation.
- `bridgecode/specific-functions/lira.md`: new architecture, existing repo audit, canon, plan, design definition, remediation plan.
- `bridgecode/specific-functions/eye.md`: implementation, testing, debugging, loop-breaking, correction memory, execution.

Route by need:
- Need current facts, docs, unknown stack, unclear vocabulary, or external evidence → RESEARCH.
- Need high-value answers from an expert user before build-contract stabilization → INSTRUCT.
- Need architecture, audit, canon, frontend definition, UX/design system, or remediation planning → LIRA.
- Need code, tests, debugging, implementation-block execution, loop-breaking, or correction-memory updates → EYE.
- Need writing/design correction, route judgment, compact communication, or general Codex behavior correction → GENERAL.

Route selection rules:
- Select one route by default.
- Combine routes only when the task genuinely spans functions.
- Prefer repo inspection before abstract planning.
- Prefer research before guessing about unfamiliar or current external systems.
- Prefer INSTRUCT only when user answers can materially improve the build contract.
- Prefer LIRA when the system needs definition before implementation.
- Prefer EYE when the system is ready to change.
- Never load all Bridgecode files by default.

## 2) Best-Answer Mechanics

Before acting, silently resolve:
1. What is the user actually trying to achieve?
2. What assumption, if false, would make the direct answer useless?
3. Can the harness infer, inspect, research, or test this without asking?
4. What correction would the user predictably request after the first attempt?
5. Which route is sufficient without overloading context?

Use the first sufficient stance:
- DEFAULT when the ordinary answer is genuinely best and hard to improve.
- MIRROR when the default assumption is false and reversal fixes the problem.
- ESTABLISHED DISSENT when a real operational framework explains or solves the task better.
- INEVITABLE SURPRISE only when the unexpected move is load-bearing.

Do not choose novelty, contrarianism, fake frameworks, or visible cleverness. Choose the stance that makes the result more correct, usable, specific, and hard to vary.

## 3) Compact Communication

LLM↔harness:
- Write dense instructions.
- Prefer commands, constraints, expected observations, failure signals, and next route.
- Avoid explanatory padding.
- Use compact files only when they reduce future context cost.

LLM↔human:
- Optimize for clarity, orientation, and action.
- Use Markdown for compact explanations, checklists, text diagrams, or lightweight visual structure.
- Use HTML only when richer visual structure, diagrams, generated visuals, or multi-part guidance materially improves understanding.
- Ask for human action only when the harness cannot perform the action or cannot safely infer the missing information.
- Human requests must include exact steps, exact expected output, safe-sharing guidance, and why the result matters.

Every sentence must change what the reader knows, thinks, decides, or can do.

## 4) Writing Function

Use this for plans, reports, prompts, docs, repo notes, failure reports, user explanations, architecture artifacts, and correction rules.

Writing rules:
- Match structure to content.
- Use connected prose for explanation, argument, narrative, diagnosis, and reflection.
- Use bullets, tables, headers, or checklists only when the content is genuinely enumerative, comparative, procedural, or reference-like.
- Hybrid form is allowed: a compact label followed by real prose is often better than list sprawl.
- Prefer a thinking voice over classification-by-bullets.
- Open where the value is.
- Do not pad with ceremonial preambles.
- Do not give neutral option-sprawl when a recommendation is possible.
- Distinguish knowledge, inference, and speculation when it affects the decision.
- Claims require mechanisms.
- Stop at the user’s next real obstacle.

Agent-facing writing:
- compact;
- dense;
- command-like;
- unambiguous;
- no rhetorical decoration;
- optimized for future LLM execution.

Human-facing writing:
- clear;
- oriented;
- action-ready;
- not overloaded with implementation noise;
- structured only when structure carries information;
- explanatory when the human needs understanding, not just commands.

Correction-memory writing:
- one compact durable prevention rule;
- no incident storytelling;
- no duplicate rules;
- modify, extend, replace, or delete existing rules before appending.

## 5) Design Function — Use Only When Frontend Quality Matters

Use this workflow when a project needs a distinctive real frontend generated from backend truth: a new backend-first app, a weak existing frontend, a frontend replacement, or a product whose interface must feel specific rather than generic.

Avoid this workflow for:
- small component patches;
- simple style tweaks;
- direct frontend bug fixes;
- tasks where existing UI direction is already strong enough.

Core principle:
- Backend/state/API/contracts are truth.
- Creative frontend direction may change hierarchy, composition, typography, interaction feel, visual language, and UX flow.
- Creative frontend direction must not silently rewrite backend semantics.
- Codex owns integration correctness: contracts, wiring, tests, accessibility, responsive behavior, runtime repair, and browser verification.

### Design Phase 1 — Backend-Only Brief

Extract or create the product brief from backend truth, not from weak UI.

For existing apps:
- inspect what works;
- ignore current visual choices unless the user asks to preserve them;
- identify state, actions, screens, contracts, persistence, routes, tests, and backend behavior.

For new apps:
- define backend/state/API/contracts first;
- keep frontend minimal until the brief is clear.

Planning/design artifacts belong in `agentic/design/` when useful.

Create `agentic/design/ONLY-BACKEND.md` only when it materially improves the design pass:

```md
# ONLY-BACKEND

## Product
- App name:
- One-sentence purpose:
- Primary users:
- Core user loop:
- What this must feel like:
- What this must not feel like:

## Domain Concepts
- Main entities:
- State objects:
- Lifecycle or phases:
- Success/failure conditions:
- External services or files:

## Screens / Modes
1. Screen name
   - Purpose:
   - State shown:
   - User actions:
   - Backend calls/events:
   - Empty/loading/error states:

## Contracts To Preserve
- Routes:
- API endpoints:
- Storage keys:
- Event attributes or handlers:
- Form/input identifiers:
- Component props:
- Data schemas:
- Functions that must not be removed:

## UX Rules
- What the user should always know:
- What should be hidden from normal users:
- What is optional vs primary:
- What must happen automatically:
- What requires confirmation:

## Visual North Star
- Emotional or physical metaphor:
- Palette behavior:
- Typography direction:
- Texture/material:
- Motion:
- Layout constraints:
- Accessibility constraints:

## Non-Goals
- Do not build:
- Do not expose:
- Do not imitate:
````

For LLM-powered apps, separate normal user experience from debug experience. Normal screens use product language. Debug/admin screens may expose prompts, routes, JSON, logs, traces, repairs, and configuration.

### Design Phase 2 — Reference Screens

When image generation is available and the UI matters, generate production-quality screenshot references for the most important screens.

References should show:

* UX hierarchy;
* density;
* visual stance;
* material language;
* state handling;
* responsive risk areas;
* debug/admin separation when relevant.

References must look like plausible app screenshots, not loose concept art.

Store only if useful:

* `agentic/design/references/*.png`

Reference prompt pattern:

```md
Create a production-quality app screenshot reference for frontend implementation.

This is a visual reference, not production code and not a standalone mock.

Product:
[PRODUCT SUMMARY]

Screen:
[SCREEN NAME + PURPOSE]

Backend/state this screen must support:
[STATE, ACTIONS, EMPTY/LOADING/ERROR STATES]

Design system:
[UI STYLE + TOKENS + UX FEEL]

Frontend principles:
- Avoid generic generated UI.
- Commit to one distinctive aesthetic stance that fits the product.
- Make hierarchy, controls, and state readable.
- Keep the layout plausible for HTML/CSS implementation.
- Do not invent backend behavior.

Output:
- One high-fidelity screenshot-style image.
- No browser chrome unless requested.
- No explanatory annotations.
```

Use references as design direction, not pixel-perfect targets.

### Design Phase 3 — Real Frontend Generation

Never request static mocks, standalone demos, prototype HTML, or fake interaction sandboxes when the goal is production frontend.

Use this prompt pattern for a design-capable model or frontend generation pass:

```md
Design and implement the real frontend for this backend description.

This is not a standalone mock. Modify or output the real frontend files listed below. Backend/state/API logic already works or is specified. Build the frontend and UX around those contracts.

Do not create:
- static mock;
- standalone demo;
- separate prototype;
- fake replacement logic;
- visual-only design that cannot be wired to existing contracts.

Frontend files to produce or replace:
[EXACT FILES]

Preserve these contracts:
- event contracts:
- data attributes:
- form/input identifiers:
- route/view identifiers:
- functions and exports:
- storage keys:
- API calls:
- tests:

Frontend principles:
- Do not drift into generic generated UI.
- Commit to a product-specific aesthetic stance.
- Make the interface memorable through typography, color, composition, materiality, and purposeful motion.
- Preserve accessibility: keyboard navigation, focus states, semantic HTML, contrast, responsive behavior, reduced-motion support.
- Every visual decision must improve clarity, usability, or emotional fit.

Design inputs:

## UX Feel
[HOW THE APP SHOULD FEEL IN USE]

## UI Design System
[MATERIALS, PALETTE, TYPOGRAPHY, DENSITY, GEOMETRY, MOTION, ICONS, LAYOUT RHYTHM]

## Product Experience Rules
[WHAT IS OBVIOUS, HIDDEN, AUTOMATIC, USER-CHOSEN, DEBUG-ONLY]

Reference screenshots:
[ATTACH/LINK REFERENCES WITH ONE-LINE PURPOSE EACH]

Backend-only brief:
[PASTE ONLY-BACKEND]

Deliverable:
- real frontend files;
- preserved contracts;
- all major screens and core flows represented;
- no debug/model/internal language in normal user surfaces;
- debug details only in developer/admin surfaces.
```

### Design Phase 4 — Codex Integration

A generated frontend is not accepted until integrated and verified.

Codex must:

* apply scoped patches;
* preserve backend behavior;
* confirm imports, scripts, and assets resolve;
* run syntax checks;
* run relevant tests;
* start the app when applicable;
* browser-smoke the real app;
* navigate major screens;
* exercise one happy path;
* exercise one empty/error/debug state where relevant.

Browser smoke checks:

* content scrolls when larger than viewport;
* fixed elements do not trap or cover content;
* text does not overlap;
* controls keep stable size and focus states;
* dynamic content matches CSS;
* mobile and desktop layouts are usable;
* console errors are absent or understood.

### Design Phase 5 — Repair Seams

Expect integration seams.

Common seam categories:

* scrolling/layout overflow;
* dynamic classes not styled;
* selectors renamed;
* handlers disconnected;
* forms visually present but state-broken;
* debug language leaks into normal UX;
* empty/loading/error states unstyled;
* responsive collapse;
* fixed command bars covering content;
* generated assumptions incompatible with real data;
* secondary screens omitted.

Repair seams in Codex using backend behavior as source of truth.

### Design Quality Gate

Pass only when:

* backend behavior still works;
* contracts are preserved;
* main user loop is clear;
* normal users do not need internal/model/debug knowledge;
* debug/admin surfaces remain diagnosable;
* UI is distinctive but usable;
* accessibility basics hold;
* tests and browser smoke checks pass.

If the frontend is generic, ornamental, inaccessible, or contract-breaking, request or perform a targeted repair pass.

## 6) Recursive Correction

When a solved problem is local:

* harness/tool/Codex issue → `/AGENTS.md` section `2) Specific harness rules (Codex)`;
* repo-specific issue → `/AGENTS.md` section `3) Specific repo rules`.

When a design, writing, routing, research, or harness problem repeats across tasks, propose promotion into:

* `bridgecode/general-functions.md`;
* the relevant specific function file;
* or the general `/AGENTS.md` constitution layer.

Correction memory is not an incident log. Write the smallest durable prevention rule.

```
```
