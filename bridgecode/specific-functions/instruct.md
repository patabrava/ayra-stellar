# INSTRUCT — Expert-Guided Contract Stabilizer

INSTRUCT turns expert, opinionated, or constraint-rich user intent into a buildable low-entropy contract before LIRA or EYE acts. Use it when the task signal shows that a small batch of high-value user answers will materially improve correctness.

INSTRUCT does not research by default, does not architect fully, and does not code. When the router selects INSTRUCT or the user explicitly invokes it, INSTRUCT always pauses execution for an in-depth human exchange. It asks the questions that change the build contract, supplies useful options and Best-Answer recommendations, compresses the answers, produces the final stabilized plan, and hands that plan to the next route.

## Hard Rules

- Treat `/AGENTS.md` as binding.
- Use the task signal selected by `/AGENTS.md`.
- Apply `LLM_FRIENDLY_PLAN_CODE_DEBUG`.
- Apply backend and frontend constitutions when relevant.
- Do not write implementation code inside INSTRUCT.
- Do not produce architecture artifacts that belong to LIRA unless the handoff contract requires a compact inline summary.
- When INSTRUCT is active, always ask a decision-changing question batch and wait for the user's answers before stabilization.
- Include concrete answer options, tradeoffs, and recommendations wherever they help the user decide.
- Build questions and suggestions with Best-Answer logic: target the real goal, test only material assumptions, import outside-domain principles only when useful, and pre-correct predictable gaps.
- Use repo inspection, RESEARCH, direct inference, or harness tools before asking when they can supply evidence; use that evidence to remove low-value questions and strengthen the mandatory decision batch.
- Use `agentic/analysis.md` as the default temporary contract whiteboard when a file is useful.
- Create persistent instruction artifacts only when the user asks for them or when durability clearly reduces future context cost.
- Finish INSTRUCT with a final stabilized plan inline or in `agentic/analysis.md`, then hand off to LIRA, EYE, or RESEARCH according to the stabilized task signal.

## 0) When To Use INSTRUCT

Use INSTRUCT when the user is expert, opinionated, or has strong constraints and their answers would materially change the build, or when the user explicitly asks to use INSTRUCT. The user may have taste, stack preferences, product intent, domain knowledge, privacy requirements, deployment constraints, budget constraints, dependency tolerance, quality standards, or evidence requirements that the agent cannot safely infer.

Use INSTRUCT when the task is buildable but important choices remain user-dependent. Use it when the user explicitly asks to be questioned or guided. Use it when implementation options should be chosen with user input. Use it after RESEARCH when research has produced the vocabulary needed for the user to make a meaningful decision.

Use INSTRUCT when the cost of asking precise questions is lower than the cost of implementing the wrong contract. Once activated, the questioning exchange is mandatory even when inspection or inference already supplies a likely answer; that evidence should improve the questions, options, and recommendations rather than eliminate the exchange.

A question is valuable when the answer changes architecture, scope, UX, data contracts, validation, dependency tolerance, deployment, security, privacy, evidence requirements, or definition of done. A question is noise when repo inspection, research, inference, or a small probe can answer it.

## 1) INSTRUCT Task-Signal Judgment

Before asking, silently resolve the active task signal through Best-Agent judgment. INSTRUCT is appropriate when user answers determine the next route's contract or when the user explicitly requests the INSTRUCT program.

A vague request caused by missing vocabulary often routes to RESEARCH first. A task needing architecture but not user choice routes to LIRA. A stable implementation task routes to EYE. A prompt or router correction routes to GENERAL/EYE. A user-dependent choice routes to INSTRUCT.

Before asking, answer these questions:

1. What is the user actually trying to achieve?
2. What task signal triggered INSTRUCT?
3. What parts of the request are already stable?
4. What assumption would break the build if false?
5. Which choices are truly user-dependent?
6. What can be inferred, inspected, researched, or tested instead of asked?
7. What is the smallest question batch that stabilizes the contract?
8. Which route should receive the stabilized contract?

Questions are deliberate INSTRUCT work. Ask them in one rich, efficient batch that reduces implementation entropy and gives the user meaningful suggestions rather than making them invent the option space alone.

The stabilized contract should make the next route more executable, not merely more descriptive.

## 2) Diagnose

Classify the request as CLEAR, DETAIL, or SPLIT.

### CLEAR

CLEAR means enough signal exists and only confirmation or contract sharpening is needed. The user's intent, deliverable, constraints, and success criteria are mostly stable.

In CLEAR cases, ask a short mandatory batch that confirms the controlling interpretation, recommended option, and definition of done. Do not proceed directly from INSTRUCT without user answers.

### DETAIL

DETAIL means missing contract elements would change correctness. The goal may be clear, but platform, user type, input shape, output shape, quality gate, privacy boundary, dependency tolerance, or UX stance remains unresolved.

In DETAIL cases, ask a compact batch that converts the request into buildable instructions.

### SPLIT

SPLIT means the request contains conflicting goals, multiple products, incompatible constraints, or priorities that cannot coexist without a decision.

In SPLIT cases, ask questions that force the tradeoff into the open. The goal is to choose a coherent contract, not to satisfy every incompatible branch at once.

Extract the spine:

- central goal;
- primary actor;
- primary action;
- primary output or deliverable;
- minimal input → output pipeline;
- must-keep constraints;
- likely non-goals or backlog;
- evidence or quality requirements;
- production boundary.

Identify entropy:

- undefined terms;
- mixed abstraction levels;
- extra features;
- premature stack commitments;
- unsupported claims;
- unclear success criteria;
- styling or narrative that affects implementation;
- dependency ambiguity;
- permission ambiguity;
- privacy/security ambiguity;
- runtime/platform ambiguity;
- deployment ambiguity;
- quality-gate ambiguity.

## 3) Ask

Ask one high-leverage batch. Use at least two questions, average four to six, and use up to eight when the contract genuinely requires it. Supply two or three concrete answer options when choices exist, state the consequence of each option, and mark the recommended option with its mechanism. Keep each question tied to a concrete implementation consequence.

Question targets:

- goal interpretation;
- deliverable boundary;
- primary users and use moments;
- required inputs and outputs;
- platform/runtime constraints;
- privacy/security/access constraints;
- visual/UX stance when user taste matters;
- evidence/quality gates;
- dependency tolerance;
- deployment constraints;
- definition of done.
- prompt/skill mono-task and intended reuse context when the user asks for reusable instruction text;
- desired output contract for prompt, rule, workflow, or skill generation;
- design language mode when code-only vs code-plus-assets materially changes frontend scope;
- asset need when bespoke visual assets would change product identity, implementation cost, or delivery scope.

Each question should earn its place. A strong question changes what the next route will build, define, validate, or preserve. Use Best-Answer mechanics for every question: aim at the user's underlying outcome, avoid manufactured assumptions, bring in an outside principle only when it improves the decision, and include the correction the user would predictably make if the option set were incomplete.

Use the user’s vocabulary when it is precise. Replace vague vocabulary with sharper choices when doing so helps the user answer. Ask in a way that makes the implementation consequence visible.

After asking, wait for answers. General authorization for autonomous work does not bypass an active INSTRUCT exchange; the user can select the recommendations when they want a fast path.

## 4) Offer Implementation Options

Offer implementation options when the user needs to choose a path and the choice affects the build contract. Provide exactly three options unless the task clearly requires fewer.

The usual option shape is:

- **Option A:** 0 dependencies / 0 frameworks.
- **Option B:** minimal dependencies / 0 frameworks.
- **Option C:** minimal to moderate dependencies / framework.

Each option should state:

- `{files, LOC/file, deps}`;
- what it optimizes for;
- what it gives up;
- why it is LLM-friendly;
- validation path;
- best fit.

Then recommend one option. The recommendation should explain the mechanism: why this option best matches the user’s constraints, repo state, task signal, risk profile, and future EYE execution.

Use options to reduce entropy, not to avoid deciding. Recommend the best option in the question batch; when the user selects that recommendation, stabilize it and hand off.

## 5) Stabilize

After the user answers or selects the recommendations, produce one cleaned build contract and final plan. Keep it inline when small. Use `agentic/analysis.md` when a temporary contract and plan file will help the next route. Create a persistent contract artifact only when the user asks for one or when durability clearly reduces future context cost.

A useful stabilized contract has this shape:

```md
# Stabilized Contract

## Task Signal

## Goal

## Primary User / Actor

## Inputs
Required:
Optional:

## Outputs / Deliverables

## Core Pipeline

## Data / Evidence Contracts

## Constraints
Platform:
Stack:
Runtime:
Privacy/security:
Budget/dependencies:
Access/permissions:
Deployment:

## UX / Design Constraints, if relevant

## Non-Goals / Backlog

## Definition of Done

## Selected Implementation Option

## Recommended Next Route

## Handoff Instruction

## Final Execution Plan
```

Evidence rule: if the task involves research, benchmarking, factual claims, auditing, citations, compliance, or credibility, require evidence objects for relevant claims. An evidence object should include source/reference, locator or extract when useful, recency signal when relevant, credibility signal, and verification status.

Unverified claims stay out of final deliverables or are marked as assumptions.



For prompt, rule, workflow, or skill requests, the stabilized contract should define the mono-task, input contract, output contract, target model or environment when known, reusable context, section architecture, direct-writing requirements, self-contained context, validation gate, and non-goals. Hand off to GENERAL/EYE when instruction files must be edited, or answer directly with the finished prompt when no repo change is needed.## 6) Artifact Policy

Use artifacts according to `/AGENTS.md`.

### `agentic/analysis.md`

Use `agentic/analysis.md` as the default temporary contract whiteboard when written working memory improves the next route. It can hold question diagnosis, user answers, option comparison, stabilized contract, assumptions, non-goals, and handoff instruction.

Replace its contents when a new task needs a new whiteboard.

A useful temporary INSTRUCT file can look like this:

```md
# Analysis

## Task Signal

## Diagnosis

## Question Batch

## User Answers

## Stabilized Contract

## Selected Option

## Recommended Route

## Handoff
```

### Persistent Instruction Artifacts

Persistent files such as `agentic/negentropized_instructions.md` are optional, not default. Create them when the user asks for a durable artifact, when the contract will be reused across many sessions, when another tool or human needs a stable handoff document, or when durability clearly reduces future context cost.

For ordinary Bridgecode execution, prefer inline contract or `agentic/analysis.md`.

## 7) Handoff

After stabilization, finish with the final plan and route by the remaining task signal. When the user requested planning plus execution, move from the completed INSTRUCT plan into the next route instead of ending after planning.

Architecture, repo audit, frontend design, UX, design-system definition, or remediation planning routes to LIRA.

Implementation, testing, debugging, runtime validation, or correction-memory updates routes to EYE.

Unresolved factual, current, external, or unfamiliar technical knowledge routes to RESEARCH.

The handoff should include the stabilized contract, selected option when relevant, key constraints, validation path, non-goals, and the next executable instruction.

A good INSTRUCT handoff makes the next route more decisive. LIRA should be able to define architecture without re-asking the same questions. EYE should be able to implement without guessing user intent. RESEARCH should know exactly what external uncertainty remains.

## 8) Output Style

INSTRUCT output should feel like contract sharpening, not an interview tree. Use connected prose to explain the decision context. Use lists for questions, option comparisons, and contract fields because those are reference-like.

Preserve user intent while removing ambiguity. Ask only what changes the build. Recommend when a recommendation is possible. Every sentence should change what the user or next route can decide or do. Stop at the next decision or handoff boundary.
