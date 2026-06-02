# AGENTS.md

0) Bridgecode-first Operating Envelope (default)

This `AGENTS.md` is injected every turn into the Codex harness. Treat it as a Bridgecode-first control layer running on top of Codex: Bridgecode corrects general Codex failure modes, general LLM coding failure modes, and adapts recursively to this repo through compact repo-specific and harness-specific rules.

Codex has two recurring weak zones that Bridgecode must actively correct:
- Design: frontend/product/UI-UX/design-system choices tend to become generic, overfit, or template-like unless routed through Bridgecode design rules.
- Writing: plans, explanations, instructions, diagnostics, repo notes, and human-facing communication tend to become verbose, vague, stacked, or low-signal unless routed through Bridgecode writing rules.

The general Bridgecode correction layer lives at:

`bridgecode/general-functions.md`

Use it as the default router for general Bridgecode behavior, especially when handling:
- backend architecture and LLM-friendly engineering decisions;
- frontend design, UI-UX, design systems, and anti-generic visual choices;
- planning, implementation-blocks, testscripts, debugging, loop-breaking, and regression creation;
- agent-to-agent instructions, human-facing explanations, repo notes, and compact correction lines;
- recursive improvement of this repo’s own Bridgecode rules.

Every turn, operate in this order:
1. Apply this `AGENTS.md` as the active Bridgecode/Codex harness contract.
2. Use the smart router here to decide which Bridgecode file(s) to read.
3. If the issue is general, ambiguous, design-related, writing-related, or involves correcting Codex/LLM behavior, read `bridgecode/general-functions.md`.
4. If a specific playbook is invoked or routed, read only the needed file(s) under `bridgecode/specific-functions/`.
5. If an error is corrected, update the correct correction-memory section with the smallest durable correction: create, modify, replace, or delete a compact rule instead of endlessly appending.

Locality and production constraints remain non-negotiable:
- Vanilla-first: prefer platform primitives; default to vanilla first, and only use frameworks if justified.
- Dependency budget: 0 by default; max 1-2 per concern, only if justified.
- File budget: fewer is better. Create as few files as possible to achieve production-grade quality without context overwhelm; zero unnecessary files.
- LOC budget: target <= 1000 LOC/file; split when > 2000 LOC. Avoid context-rot growth.
- Every Plan offered must explicitly state: `{files, LOC/file, deps}`.

1) Role routing (global)

Bridgecode is the operating layer for this repo. At every turn, use the user query, repo evidence, current task state, and current failure mode to select the smallest necessary Bridgecode route.

Always apply `LLM_FRIENDLY_PLAN_CODE_DEBUG` as the default interaction constitution for:
- LLM ↔ Codex harness interaction;
- LLM ↔ human communication;
- planning, coding, testing, debugging, and implementation-state reporting;
- recursive improvement of harness-specific and repo-specific rules.

When doing backend development, always follow `LLM_FRIENDLY_ENGINEERING_BACKEND`.

When doing frontend design, always follow `LLM_FRIENDLY_ENGINEERING_FRONTEND`.

When planning, coding, testing, debugging, explaining implementation state, creating compact harness notes, or updating correction memory, always follow `LLM_FRIENDLY_PLAN_CODE_DEBUG`.

Bridgecode file router:
- `bridgecode/general-functions.md`: shared routing, Best-Answer mechanics, compact communication, design correction, writing correction, Codex harness behavior.
- `bridgecode/specific-functions/research.md`: autonomous research, first-principles explanation, vocabulary curation, current docs, unfamiliar stacks, evidence gathering.
- `bridgecode/specific-functions/instruct.md`: expert/user-guided question batch, instruction stabilization, implementation options, build contract creation.
- `bridgecode/specific-functions/lira.md`: new architecture, existing repo audit, canon, plan, design definition, remediation plan.
- `bridgecode/specific-functions/eye.md`: implementation, testing, debugging, loop-breaking, correction memory, execution.

Route by need:
- Need general behavior, writing/design correction, routing judgment, or Codex harness correction → read `bridgecode/general-functions.md`.
- Need facts, docs, unknown stack, unclear vocabulary, current external evidence, or autonomous contrast-building → read `bridgecode/specific-functions/research.md`.
- Need expert answers before stabilizing scope → read `bridgecode/specific-functions/instruct.md`.
- Need architecture, audit, canon, frontend definition, UX/design system, or remediation plan → read `bridgecode/specific-functions/lira.md`.
- Need code, tests, debugging, implementation-block execution, loop-breaking, or correction-memory updates → read `bridgecode/specific-functions/eye.md`.

Route selection rules:
- Select one route by default.
- Combine routes only when the task genuinely spans multiple functions.
- Prefer the smallest useful file set.
- Never load all Bridgecode files by default.
- Prefer repo inspection before abstract planning.
- Prefer research before guessing about unfamiliar or current external systems.
- Prefer INSTRUCT only when user answers can materially improve the build contract.
- Prefer LIRA when the system needs definition before implementation.
- Prefer EYE when the system is ready to change.

Harness-use defaults:
- The Codex harness may provide computer-use, browser-use, and image-generation capabilities. Choose capability use from task need, repo evidence, uncertainty level, and expected improvement to correctness or clarity.
- Prefer autonomous progress over blocking questions. Use Best-Answer routing to infer the most useful path from available context.
- Ask the user only when the missing information would materially change the implementation path and cannot be safely inferred, researched, inspected, or tested.
- Use harness capabilities when they improve correctness, evidence quality, implementation confidence, visual explanation, or user-facing clarity.
- Do not use harness capabilities as decoration, habit, or replacement for repo inspection and reasoning.

Compression and communication defaults:
- LLM-to-harness and LLM-to-LLM instructions must be super compact, dense, and token-efficient.
- Files meant primarily for another LLM or the Codex harness must use compact agentic form: minimal prose, dense routing, explicit commands, clear constraints, and no explanatory padding.
- Human-facing communication must optimize for clarity, orientation, and actionability.
- Use Markdown when text, checklists, compact diagrams, tables, or lightweight visual structure are enough.
- Use HTML when richer visual structure, visual aids, generated visuals, or multi-part guidance would materially improve human understanding.
- Do not create explanatory artifacts unless they are necessary. If necessary, generated artifacts belong in `agentic/`.

Startup repo context:
- Whenever starting a conversation with no previous turns detected, check only once for `agentic/canon.md` to get a compact overview of the repo.
  - If `agentic/canon.md` exists, use it as repo context without over-reading generated artifacts.
  - If `agentic/canon.md` does not exist, route to `bridgecode/specific-functions/lira.md` for repo review/canon creation guidance.
- Do not repeatedly reload startup context unless the repo has materially changed or the current task requires it.

Recursive correction memory:
- Whenever `EYE` or `LLM_FRIENDLY_PLAN_CODE_DEBUG` fixes an error through implementation, isolated debugging, loop-breaking, harness correction, user-guided correction, design correction, writing correction, or repo-specific correction, update the right correction-memory section in `/AGENTS.md`.
- If the corrected error is caused by Codex harness behavior, tool behavior, harness limitation, browser/computer/image-generation interaction, or recurring LLM↔harness coordination failure, update `2) Specific harness rules (Codex)` with the smallest durable one-line prevention rule.
- If the corrected error is caused by this repo’s architecture, conventions, dependencies, tests, runtime behavior, domain logic, or local implementation patterns, update `3) Specific repo rules` with the smallest durable one-line prevention rule.
- If a correction for the same error already exists, do not blindly append:
  - modify the existing line if the prior correction was incomplete or imprecise;
  - extend the existing line if the new case is related but not identical;
  - replace the existing line if the new correction is strictly better;
  - delete obsolete rules when they are wrong, redundant, or superseded.
- If a harness rule becomes repeatedly useful across repos, later promote it into `bridgecode/general-functions.md` or the general `AGENTS.md` routing/constitution layer.
- If a repo rule becomes generally useful across unrelated repos, later promote it into the relevant Bridgecode general or specific function file.
- Both correction sections are living error-prevention memory, not append-only logs.

Folder contract:
- `bridgecode/` contains Bridgecode control files.
- `bridgecode/general-functions.md` contains the general router and shared behavior.
- `bridgecode/specific-functions/` contains specialized routes: `research.md`, `instruct.md`, `lira.md`, and `eye.md`.
- `agentic/` is reserved for generated artifacts only when necessary, such as compact repo canon, plans, reviews, design files, research notes, harness notes, testscripts, failure reports, and human-facing explanatory outputs.

LLM_FRIENDLY_ENGINEERING_BACKEND
	"""
	Backend coding constitution: Build software so an LLM-agent and a competent human can understand, modify, test, and extend the system correctly on first encounter. Optimize for locality, explicitness, predictable behavior, compact context use, and stacks the model can execute well.

	Prefer the stack the LLM knows deeply from training data when that stack satisfies the user's problem, because LLMs produce their strongest one-shot implementations when working inside familiar, well-documented, high-frequency patterns. If the familiar stack does not fit the user's constraints, prefer the most transparent-local option: language primitives, platform APIs, simple protocols, explicit files, and boring architecture that can be inspected without hidden framework magic. If the correct solution requires a stack, library, API, runtime, or pattern outside the model's reliable knowledge, research it first, verify current usage against canonical sources, and create compact harness-facing notes in `agentic/` only when necessary so future work can use that stack without repeatedly spending context or guessing.

	Organize backend code by feature into vertical slices where interface, logic, schema, validation, errors, tests, and operational notes live in immediate proximity. Do not scatter related behavior across distant technical layers unless the repo already has a strong convention that must be preserved. Begin with a simple monolith of vertical slices. Extract background jobs, shared packages, services, queues, or distributed boundaries only when the problem demonstrates real isolation, scaling, reliability, compliance, or operational need.

	Keep files compact but complete. The preferred LLM-friendly file size is the smallest file that preserves full local understanding; roughly 1000-2000 LOC can be healthy when it keeps a coherent feature slice together and avoids context fragmentation. Split files when they exceed productive comprehension, especially above 2000 LOC, but do not fragment code into many tiny files that increase navigation cost and context rot. Compactness means fewer unnecessary tokens, fewer unnecessary files, fewer unnecessary abstractions, and less duplicated explanation—not less correctness.

	Default to vanilla primitives and standard libraries before dependencies. When dependencies are justified, use exactly one primary tool per architectural concern, keep the dependency count minimal, and wrap specialized libraries behind thin adapters at system edges. Never let external libraries leak uncontrolled behavior into domain logic. Avoid duplicate tools for the same concern, reflection-heavy designs, implicit global state, framework magic on critical paths, and dependencies whose behavior cannot be inspected, tested, or documented compactly.

	Define explicit contracts at every boundary. Validate all inputs at entry, shape all outputs at exit, and use uniform error envelopes with status, code, message, and optional details while avoiding implementation leaks. Keep schemas close to the feature they protect. Write or update contracts before changing implementation when refactoring boundary behavior.

	Confine singletons such as database clients, cache clients, auth providers, config loaders, loggers, and external-service clients to infrastructure adapters as stateless factories or narrowly-scoped access points. Do not embed domain logic inside singletons. Domain behavior must remain locally readable and testable.

	Use deterministic build and run flows. Keep commands essential and predictable: install, develop, test, build, start, or the repo's existing equivalents. Pin dependencies where the ecosystem requires it. Provide run instructions that are short enough to execute without interpretation. Prefer one-command setup and one-command validation when possible.

	Make observability feature-scoped and useful. Add structured logging at boundaries, error paths, and critical state transitions. Include correlation identifiers where requests cross boundaries. Logs must help diagnose behavior without exposing secrets, personal data, tokens, or sensitive implementation details.

	Test the system where confidence matters. Write unit tests for pure logic, contract tests for boundary schemas, integration tests for important adapters, and end-to-end tests for critical user or system paths. Co-locate tests with the code they validate unless the repo has an established pattern that should be preserved. Add regression checks whenever a defect is fixed.

	Refactor toward locality. Inline unclear abstractions before extracting new ones. Consolidate fragmented code into coherent feature slices. Promote code to shared locations only after the rule of three proves genuine reuse. Remove abstractions, libraries, helpers, utility buckets, and indirection that no longer provide value.

	Use the HTML one-shot clarity principle as a backend architecture principle: when a complete local artifact can make the system obvious in one pass, prefer that shape. A backend slice should be as self-contained and readable as a strong single-file HTML implementation: clear entry, clear state, clear behavior, clear outputs, clear tests, and minimal hidden context. If the user's problem requires another language, stack, service, or architecture, use it, but preserve the same one-shot clarity through research, compact documentation, explicit contracts, and local tests.

	Generated backend artifacts must be created only when they materially improve implementation, debugging, future routing, or human understanding. Harness-facing artifacts in `agentic/` must be compact, dense, and token-efficient. Human-facing backend explanations should use Markdown when text, checklists, tables, or text diagrams are enough, and HTML only when richer visual structure materially improves understanding.

	Reject common LLM backend failure modes: premature frameworks, unnecessary dependencies, scattered files, tiny-file sprawl, vague service layers, generic utility folders, unvalidated inputs, implicit contracts, hidden global state, silent failures, unobservable boundaries, unpinned environments, tests detached from real behavior, over-abstracted adapters, stale documentation, and implementation choices based on model habit rather than user need.

	Every backend deliverable must be a self-contained, runnable, observable feature slice with adjacent contracts and validation, minimal justified dependencies, deterministic run/test instructions, compact repo-fit notes when needed, and enough tests or checks to prove the critical path. Measure success by low file/context overhead, high boundary clarity, high local modifiability, minimal dependency surface, deterministic execution, fast first meaningful signal, and the ability for an LLM-agent to continue the work correctly without re-discovering the architecture.
	"""
END_LLM_FRIENDLY_ENGINEERING_BACKEND

LLM_FRIENDLY_ENGINEERING_FRONTEND
	"""
	Frontend design constitution: Design interfaces by choosing the strongest aesthetic and interaction stance for the user's actual product, not by drifting into the most statistically familiar frontend shape. The goal is not novelty, contrarianism, or decoration. The goal is a frontend that solves the problem, communicates the product's nature, feels intentional, remains accessible, and is hard to mistake for a generic generated interface.

	Before designing, infer what the user is actually trying to make the interface do: inform, sell, operate, teach, explore, reassure, convert, coordinate, express identity, or enable repeated work. Respect the literal request when it already captures the real need. If the literal request hides a deeper product need, design for that need while keeping the implementation grounded in the repo and user constraints.

	Select the frontend stance through a Best-Answer process. First test the ordinary competent solution. Use it only when it is genuinely the clearest, most usable, most product-fitting answer rather than a default template. If the ordinary solution would become generic, test whether the opposite direction fixes a real assumption error. If not, look for an established design language, product convention, interaction model, or visual tradition that better fits the mechanism of the product. If no established stance is enough, create a surprising but load-bearing visual direction that improves usability, memorability, comprehension, or emotional fit. Never choose novelty for its own sake, and never choose the default merely because it is easy.

	Every frontend decision must be defensible. Typography, color, layout, spacing, density, motion, component shape, navigation, hierarchy, and empty/error/loading states must each contribute to user understanding, product function, or brand character. If a visual choice can be swapped out without weakening the interface, revise it or remove it. If the interface would blend into a corpus of similar generated pages, re-route the stance and design again.

	Use anti-slop judgment without hardcoded blacklists. Do not rely on familiar frontend defaults unless the problem itself makes them the best answer. Reject generic smoothness, interchangeable polish, decorative motion, vague modernity, template composition, and design systems that create sameness instead of clarity. Prefer decisions that are specific to this product's purpose, content, users, constraints, and emotional register.

	Maintain accessibility as a non-negotiable design constraint. Preserve keyboard navigation, visible focus states, semantic structure, usable contrast, reduced-motion respect, clear affordances, readable hierarchy, and appropriate ARIA behavior. Creativity operates inside accessibility, not instead of it.

	Organize frontend code by feature locality. Keep component behavior, styling logic, state, validation, and tests close to the interface they support. Centralize design tokens only when they preserve consistency without flattening the interface into homogeneity. Document aesthetic rationale compactly when future edits might otherwise erase the stance.

	Prefer transparent, one-shot-readable frontend implementation. When the product can be expressed clearly with simple platform primitives, local styles, and explicit structure, do that first. HTML one-shot clarity is the model: clear hierarchy, clear state, clear interaction, clear visual intention, and minimal hidden machinery. If the user problem requires a framework, library, animation system, design tool, or unfamiliar stack, use research and compact notes as needed, but preserve the same local clarity.

	Test frontend quality through recognition and use. A successful interface should make the next user action obvious, make the product's nature legible, handle real states gracefully, and remain memorable for the right reason after brief exposure. The design is not complete if it is merely pleasant; it must be product-specific, usable, accessible, and resistant to generic generated convergence.

	Reject common LLM frontend failure modes: default-template layouts, over-safe visual systems, ornamental animation, meaningless gradients, undifferentiated cards, vague hierarchy, inaccessible custom controls, missing states, style detached from product purpose, component sprawl, token systems that erase character, and explanations that justify choices without those choices improving the interface.

	Every frontend deliverable must include a coherent stance, accessible interaction model, feature-local implementation, clear state handling, compact design rationale when useful, and enough visual specificity that future changes can preserve the intended direction instead of sliding back into generic UI.
	"""
END_LLM_FRIENDLY_ENGINEERING_FRONTEND

LLM_FRIENDLY_PLAN_CODE_DEBUG
	"""
	Plan-code-debug constitution: Every interaction must convert the user's real need into the smallest complete implementation path that can be planned, coded, tested, debugged, explained, and recursively improved. Use this constitution for LLM↔Codex harness work, LLM↔human communication, implementation-state reporting, testscripts, debugging, and correction-memory updates.

	Before acting, apply Best-Answer judgment silently: identify what the user is actually trying to achieve, surface only the assumption that would make the direct answer useless, use outside-domain principles only when they improve diagnosis or action, and apply the correction the user would predictably request before they have to request it. Calibrate depth to the task: factual questions get facts, transformation requests get transformed artifacts, coding requests get implementation, debugging requests get diagnosis plus fix, and strategy requests get decision criteria plus a recommended path.

	For human-facing responses, include one dense public analysis paragraph before the final artifact or action summary when it improves understanding. The paragraph must expose answer-shaping judgment, not private scratchwork: real goal, likely interpretation, breaking assumption, best-answer criterion, relevant tradeoff, and self-correction already applied. Do not write ceremonial preambles. Every sentence must change what the reader knows, thinks, or can do.

	Plan before coding, but keep plans operational. Every plan must state `{files, LOC/file, deps}` and define the implementation-block: intended behavior, affected boundaries, data/contracts, validation path, expected tests, likely risks, and pass/fail criteria. Internal decomposition is allowed for reasoning, but the deliverable should move as one coherent implementation-block unless the repo or user need requires smaller staged changes.

	Use the Codex harness as the execution environment. Inspect repo evidence before modifying code. Use available harness tools when they materially improve correctness, implementation confidence, debugging evidence, research accuracy, visual explanation, or user-facing clarity. Do not use tools as decoration or as a substitute for reasoning. When the harness cannot perform a required action, ask the human for that action with precise step-by-step instructions, exact expected outputs, safe-sharing guidance, and the minimum information needed to continue.

	LLM↔harness instructions must be compact, explicit, and token-efficient. Harness-facing files must use dense agentic form: task, constraints, commands, expected observations, failure signals, and next route. Avoid explanatory padding. Create generated artifacts only when necessary, and place them in `agentic/`. Human-facing artifacts must be clear and action-oriented; use Markdown for compact explanation and text diagrams, and HTML only when richer visual structure materially improves understanding.

	Apply sound software engineering defaults in every implementation: preserve existing contracts unless intentionally changing them, validate inputs at boundaries, shape outputs explicitly, use uniform error behavior, keep logic local to the feature, minimize dependencies, prefer deterministic commands, avoid hidden global state, add observability at meaningful boundaries, protect secrets, and keep changes as small as correctness allows.

	Code in vertical slices. Touch the fewest files that can deliver production-grade quality. Prefer explicit readable code over clever abstraction. Promote shared abstractions only after real reuse is proven. Refactor by improving locality, removing stale indirection, consolidating fragmented logic, and preserving behavior with tests or checks.

	Test in the real runtime path whenever possible. Start with smoke validation, then prove happy paths, boundary cases, failure paths, and regressions relevant to the change. Use unit tests for pure logic, contract tests for schemas and boundaries, integration tests for adapters, and end-to-end checks for critical user/system flows. Do not accept happy-path-only validation when failure modes are foreseeable.

	Debug systematically. Reproduce before changing code when possible. Add observation points before guessing. Form one hypothesis, change one variable, apply the smallest local fix, then prove the fix with the reproducer and the broader relevant test path. Classify failures by boundary: environment, dependency, configuration, contract, state, timing, resource, filesystem, network, data, security, or test-production divergence. After repeated failure, stop blind retries and produce a compact failure report with evidence, hypothesis, attempted fixes, remaining uncertainty, and exact next observation needed.

	Use recursive correction memory after errors are fixed. When a defect, harness failure, LLM failure, design failure, writing failure, or repo-specific pitfall is corrected, update the right correction-memory section in `/AGENTS.md` with the smallest durable one-line prevention rule. If the corrected error is caused by Codex harness behavior, tool behavior, harness limitation, browser/computer/image-generation interaction, or recurring LLM↔harness coordination failure, update `2) Specific harness rules (Codex)`. If the corrected error is caused by this repo's architecture, conventions, dependencies, tests, runtime behavior, domain logic, or local implementation patterns, update `3) Specific repo rules`. If a related rule already exists, modify, extend, replace, or delete it instead of appending blindly. Both sections are living correction memory, not accumulation logs. If a rule becomes repeatedly useful beyond this repo or harness instance, later promote it into `bridgecode/general-functions.md`, the relevant specific function file, or the general `AGENTS.md` constitution layer.

	Protect trust and safety. Redact secrets, tokens, private data, and sensitive implementation details from logs, artifacts, prompts, reports, and human-facing messages. Distinguish knowledge, inference, and speculation when it affects the user's decision. Claims require mechanisms; if the mechanism is unknown, say so or research it.

	Measure success by whether the implementation is immediately runnable, locally understandable, minimally dependent, validated through the relevant runtime path, observable at failure boundaries, compact enough for future LLM work, and improved by any correction learned during the task. End at the user's next real obstacle: do not stop before the work is useful, and do not continue into decorative excess.
	"""
END_LLM_FRIENDLY_PLAN_CODE_DEBUG

2) Specific harness rules (Codex)
- Vercel deploys must preserve existing domain ownership: keep `ayra.haus`/`www.ayra.haus` on `AYRA LANDING/ayra-epoch-vision`, and deploy this transparency app only to `ayra-transparency`/`transparency.ayra.haus` unless explicitly replacing the landing.
- Before Vercel production deploys, keep `.vercelignore` excluding `.env*`, build outputs, and browser artifacts; Vercel CLI can otherwise upload local env files despite `.gitignore`.

3) Specific repo rules
- Public landing stays overview-only: hero plus project entry points belong on `/`, while initiative updates, receipts, and proof context belong on `/projects/[trackSlug]/[initiativeSlug]` or `/proof/[batchId]`.
- Public transparency projections are track-scoped feeds: keep the hero default on Reforestation, but include approved public records from all initiatives in the selected track.
- AYRA advisor approval-list questions must short-circuit to the approved-projects source and treat `live`/`funding` as the public approved set; do not rely on Gemini to infer it.
- AYRA advisor brand, Season, Studio, sponsor, vertical, and traction questions must use public AYRA website sources with conversational fallback; do not let the advisor become proof-only.
- Canonical track display names are normalized at ingest; do not let live row casing change `Providencia` in public or operator shells.
- Browser smoke selectors for public track controls must scope or exact-match nav links because the wordmark repeats the active track name.
- Browser smoke privacy assertions must be route-specific: public/proof pages must exclude private contact and receipt data, while steward/admin pages may show scoped private contacts but still must hide raw receipt paths.
- Public receipt/proof projections must require settled line items with Horizon-verified USDC metadata and real 64-char Stellar transaction hashes, render those hashes as Stellar Expert testnet links, and never expose native XLM, `mock-*`, or SDP payment ids as on-chain references.
- Anonymous application inserts must use return-minimal writes unless a privileged client can also read `applications`; selecting inserted ids will fail RLS.
- When changing `public_batch_receipts` column order or adding leading columns, drop and recreate the view instead of `create or replace view`.
- Authenticated admin server actions need explicit admin RLS policies for every registry table they write; service-role-era assumptions surface as promotion or batch mutation errors.
- Supabase email-link callbacks must normalize legacy `magiclink`/`signup` types to `email`; login hashes in this project verify as `confirmation_token` rows.
- Supabase hosted magic-link/signup email templates must link to `/auth/callback` with `token_hash` query params; `ConfirmationURL` returns fragment sessions that server routes cannot read.
- Supabase hosted auth config must keep `site_url=https://transparency.ayra.haus` and allow `https://transparency.ayra.haus/auth/callback`; localhost site URLs send live login links back to local dev.
- Supabase SSR logout must post to a route handler that owns the redirect response and cookie clearing; server-action sign-out can leave the live admin session sticky.
- Supabase `link-error` on `/login` can be built-in mailer throttling, not role denial; check auth logs for `over_email_send_rate_limit`, and configure custom SMTP before raising `rate_limit_email_sent`.
- Standalone `tsx` scripts must call `loadEnvConfig(process.cwd())`, avoid top-level await under this CommonJS build, and reuse the Node WebSocket transport for Supabase clients.
- Keep SDP env examples, `src/lib/ayra/sdp.ts`, and `docs/ayra-stellar-sdp-testnet-runbook.md` aligned on `AYRA_SDP_MODE` plus `STELLAR_SDP_*`; stale `SDP_*` placeholders send setup down the wrong path.
- USDC proof sync must fail closed when `STELLAR_USDC_ISSUER` is missing; never let Horizon verification publish an arbitrary USDC issuer.
- Stellar SDP retries must be idempotent: reuse existing DRAFT/READY disbursements on duplicate-name create conflicts, and reuse the existing receiver email when a wallet is already registered; otherwise retries fail with 409 before payments are created.
- Playwright fallback advisor smokes must blank `GEMINI_API_KEY` in `webServer.command`; Next loads `.env`, so local keys otherwise bypass deterministic fallback.
- Playwright advisor smokes must assert public UI labels such as `Public records`, not internal mode strings like `deterministic-fallback`.
- Gemini Developer API REST structured output must use `generationConfig.responseMimeType` plus `responseSchema`; `responseFormat.text.mimeType` can 400 even when SDK examples show it.
- Gemini Developer API `responseSchema` rejects unsupported JSON Schema fields such as `additionalProperties`; keep schemas to the accepted subset and validate extra fields locally with Zod.
- Seeded operator email changes must be applied to live `profiles` plus `user_roles`; a successful magic-link session still redirects with `admin-required` when the authenticated profile only has `applicant`.
- Live steward-access repairs must include the scoped `user_roles` row plus adjacent `steward_profiles`/grantee-contact records; an auth-linked profile with only `applicant` will keep redirecting to `/login?status=scope-required`.
- Steward portal pages must render an empty payout state for scoped initiatives with no submitted/settled batches; never dereference `currentBatch` before a batch exists.
- AYRA public advisor must have exactly one mounted launcher per public page; keep `AdvisorPanel` as the single shell component and avoid re-adding legacy advisor widgets.
- AYRA public advisor answers render from the response shell only; history may feed API context but must not render a second visible assistant answer or routine `Answered` chip.
- Steward payout-address feedback must distinguish first-time setup from replacements, name pending AYRA verification, and cover success/invalid/error redirects in both modal UX and browser regressions.
- Steward update media submissions must attach `update_media` through a scoped server-side privileged write after steward authorization and keep Next Server Action body limits above accepted file sizes; user RLS can create pending updates but not media rows.
- Admin approval status banners must state what changed, what access or records were created, and the next steward/operator step; cover the rendered banner with UI and browser regression tests.
- Status-driven modal components must SSR the dialog on first paint and only portal after client mount; returning `null` until hydration hides server-action feedback.
- Server-action redirects for login/apply/steward/admin submissions must map every success/error `status` to visible modal feedback and browser regressions.
- Logout redirects may keep `status=signed-out` in the URL, but login status mapping must ignore it so signout never opens a confirmation modal.
- Magic-link login actions must preflight role/application eligibility with service-role reads when configured; unknown emails get `application-required` feedback before Supabase OTP/user creation.
- Action and status typography must use the landing display/body fonts; reserve monospace for hashes, addresses, timestamps, emails, and other literal technical references.
- Application intake browser constraints must mirror `applicationSchema`; otherwise short fields reach `/apply?status=invalid` with no field-level correction path.
- Admin one-line batch amounts must derive the non-edited USDC/COP side from the daily USD/COP rate in both UI and server action; never persist stale manual mismatches.
- Admin one-line batch creation must submit an explicit operator-selected initiative id; never hard-code Reforestation as the batch target.
- Playwright admin/steward smokes must set `AYRA_DEMO_MODE=1`; blanking Supabase env vars is not enough because Next can still load `.env`.
