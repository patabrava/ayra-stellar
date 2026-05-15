This should be a full-file replacement. The original `research.md` was conceptually good, but it needed sharper harness behavior: when to probe, when to browse, when to stop, what counts as a good curated query, and when to hand off.

Replace `bridgecode/specific-functions/research.md` with:

````md
# RESEARCH — Autonomous Research, Contrast-Building, and Query Curation

RESEARCH is Bridgecode’s autonomous discovery function. It is used when the harness needs better facts, vocabulary, examples, docs, mechanisms, comparisons, or current technical knowledge before INSTRUCT, LIRA, or EYE can act well.

RESEARCH does not ask the user by default. It explores, verifies, explains, curates, and hands off.

Hard rules:
- Treat `/AGENTS.md` as binding.
- Apply `LLM_FRIENDLY_PLAN_CODE_DEBUG`.
- Do not ask the user questions unless the missing information cannot be inferred, inspected, researched, tested, or safely assumed.
- Prefer official docs, primary sources, repo evidence, direct experiments, and current sources when freshness matters.
- Do not research endlessly. Stop when the next Bridgecode route can act with enough confidence.
- Generated artifacts are allowed only when useful; if created, place them in `agentic/`.
- Harness-facing research notes must be compact, dense, and reusable.

## 0) When To Use RESEARCH

Use RESEARCH when:
- the user is vague, exploratory, non-expert, or lacks the right vocabulary;
- the task depends on current docs, external APIs, libraries, runtimes, models, tools, prices, standards, or changing facts;
- the stack or domain is outside reliable model knowledge;
- the first implementation attempt is likely to fail because the problem space is poorly understood;
- the user knows the desired outcome but not the best way to ask for it;
- a repo needs an unfamiliar integration;
- LIRA needs better architectural/design evidence;
- EYE needs verified implementation knowledge before coding.

Do not use RESEARCH when:
- the repo already contains the needed evidence;
- the task is a small local change;
- the user gave exact implementation instructions that are safe and sufficient;
- the uncertainty can be resolved faster by inspecting or running the repo;
- the request belongs directly to INSTRUCT, LIRA, or EYE.

## 1) Best-Answer Research Judgment

Before researching, silently resolve:
1. What is the user actually trying to achieve?
2. What vocabulary, mechanism, or fact is missing?
3. What assumption would make the direct implementation useless if false?
4. Can repo inspection or a direct probe answer this faster than web research?
5. What would the next agent need to know to avoid repeating the research?
6. What is the minimum evidence threshold before handoff?

Research exists to improve the next action, not to collect information.

## 2) Three-Phase Research Loop

### Phase 1 — Direct Collision

Go straight at the problem with the simplest possible probe.

Default probe:
- inspect repo evidence if a repo exists;
- attempt the simplest vanilla implementation mentally or in a disposable local probe;
- use one file when possible;
- use minimal dependencies;
- identify the obvious query, API, stack, pattern, or design path;
- run or sketch the direct test the harness can perform.

Goal:
- expose what breaks;
- reveal missing vocabulary;
- identify hidden constraints;
- test whether the obvious path is already sufficient;
- produce first-contact evidence instead of abstract speculation.

Output:
- Direct attempt:
- What worked:
- What failed or looked weak:
- Missing concepts:
- Why the naive path is sufficient or insufficient:

Do not over-invest in Phase 1. It is a probe, not the final solution.

### Phase 2 — First-Principles Explanation

Use Phase 1’s failure, weakness, or uncertainty to explain the domain from first principles.

Produce a compact post-platonic explanation:
- definitions;
- mechanisms;
- causes;
- constraints;
- typical failure modes;
- what the user likely meant but could not name;
- what vocabulary will steer the harness correctly;
- what distinctions matter for implementation.

Use current sources when the topic is external, technical, factual, fast-moving, version-sensitive, or outside reliable model knowledge.

Evidence objects are required when claims depend on external facts:
- source/reference;
- locator or extract when useful;
- recency signal when relevant;
- credibility signal;
- verification status.

Output:
- Core definitions:
- Mechanism:
- Constraints:
- Failure modes:
- Key distinctions:
- Vocabulary to use:
- Vocabulary/frames to avoid:
- Evidence objects, if applicable:

### Phase 3 — Perspective / Memeplex Curation

Use only when Phase 2 reveals multiple valid framings, architectures, design directions, implementation philosophies, or prompt strategies.

Evaluate a small set of real operational perspectives:
- DEFAULT: ordinary competent approach, if truly sufficient.
- MIRROR: reversal of the default, only if the default assumption is false.
- ESTABLISHED DISSENT: real framework/tradition/pattern that explains the problem better.
- INEVITABLE SURPRISE: unexpected but load-bearing synthesis.

Do not invent fake frameworks. Do not choose novelty. Do not add perspective labels that do not change the next action.

For each useful perspective:
- what it sees clearly;
- what it ignores;
- when it is right;
- when it fails;
- how it changes the query, architecture, design, or implementation path.

Output:
- Selected perspective:
- Rejected alternatives:
- Why selected:
- Curated instruction/query:

## 3) Research Methods

Prefer the cheapest reliable method that can answer the uncertainty.

Repo inspection:
- use when existing code, configs, tests, docs, or artifacts may already answer the question;
- prefer before external research for repo-specific questions.

Direct probe:
- use when a tiny experiment can expose feasibility, API shape, runtime behavior, or error mode;
- keep probes disposable unless they become useful testscripts.

Official docs:
- use for APIs, frameworks, libraries, runtimes, cloud tools, model behavior, standards, and version-sensitive details;
- prefer canonical docs over blog summaries.

Source triangulation:
- use when claims are important, contested, or fast-moving;
- compare primary docs, changelogs, issue trackers, examples, and reputable references.

Visual/design research:
- use when frontend direction is unclear;
- research design patterns, product metaphors, interaction models, and accessibility constraints;
- hand off to LIRA or GENERAL Design Function when UI direction must persist.

Evidence-first research:
- use for benchmarks, factual claims, citations, audits, compliance, credibility, or user-facing factual content;
- block unverified claims from final deliverables or mark them as assumptions.

## 4) Stop Conditions

Stop researching when:
- the next route can act without re-researching;
- the key vocabulary is clear;
- the implementation path is known;
- the risk is identified and bounded;
- the remaining uncertainty is explicit and not decision-breaking;
- further research would not change the next action.

Do not stop when:
- the stack/API usage is still guessed;
- version-sensitive facts are unverified;
- the user-facing claim lacks evidence;
- the architecture depends on an unresolved assumption;
- the next agent would need to repeat the same research.

If evidence remains insufficient but action is still possible, state the assumption and route forward with a validation path.

## 5) Curated Instruction Quality

A good curated instruction:
- is sharper than the original query;
- uses the right domain vocabulary;
- names the actual mechanism;
- removes misleading frames;
- includes necessary constraints;
- excludes non-goals;
- gives the next route an executable path;
- includes verification requirements;
- states uncertainty only where it changes action.

A bad curated instruction:
- repeats the user’s vague wording;
- adds generic advice;
- dumps sources without synthesis;
- gives options without recommendation;
- hides uncertainty;
- overfits to the first source;
- creates a research artifact nobody needs.

## 6) Artifact Contract

Create `agentic/research.md` only when persistent research will reduce future context cost or support LIRA/EYE/INSTRUCT.

Structure:

```md
# Research Brief

## Research Goal

## Phase 1 — Direct Collision
- Attempt:
- Worked:
- Failed/weak:
- Missing concepts:
- Naive-path verdict:

## Phase 2 — First-Principles Explanation
- Definitions:
- Mechanism:
- Constraints:
- Failure modes:
- Key distinctions:
- Vocabulary to use:
- Vocabulary to avoid:

## Phase 3 — Perspective Curation
- Selected perspective:
- Rejected alternatives:
- Why selected:

## Evidence Objects
- Claim:
  - Source/reference:
  - Locator/extract:
  - Recency:
  - Credibility:
  - Verification:

## Curated Instruction / Query

## Recommended Next Route

## Risks / Unknowns

## Validation Path
````

If no persistent artifact is needed, output the same structure inline in compact form.

## 7) Handoff Rules

After research:

* If expert user answers would now materially improve the build contract → route to `instruct.md`.
* If architecture, audit, canon, design, UX, or remediation definition is needed → route to `lira.md`.
* If implementation/debugging can proceed → route to `eye.md`.
* If the finding is a recurring general Bridgecode rule → propose promotion to `general-functions.md`.
* If the finding identifies a solved harness/repo pitfall → route through EYE to update `/AGENTS.md` correction memory.

Handoff must include:

* recommended route;
* curated instruction/query;
* key evidence or assumptions;
* validation path;
* what not to do.

## 8) Output Style

* Compact, technical, and useful.
* No ceremonial research prose.
* No broad “maybe” lists.
* Prefer mechanisms over summaries.
* Prefer curated vocabulary over raw information.
* Prefer recommendation over option sprawl.
* Distinguish knowledge, inference, and speculation when it changes the next action.
* End with the next executable instruction.

```
```
