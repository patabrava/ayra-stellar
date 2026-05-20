# AYRA AI Advisor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Embed a black-theme Gemini-backed AYRA advisor into the public transparency pages so visitors can ask about AYRA, tracks, projects, funding, paid amounts, proof, sponsorship, and Stellar transaction-hash tracing without exposing private records.

**Architecture:** Build a small vertical slice: public-safe advisor source pack from the existing AYRA domain projections, a server-only Gemini REST boundary, a `/api/advisor` route, and a black embedded client component mounted on `/` and `/projects/[trackSlug]/[initiativeSlug]`. The first implementation answers funding numbers and Stellar payment-trace questions only from deterministic public projections, uses Gemini only to compose cited answers, and falls back to deterministic answers when Gemini is not configured. Add a Supabase pgvector source table after the working path so longer AYRA docs can be retrieved without bloating prompts.

**Tech Stack:** Next.js App Router, TypeScript, React client component, existing Zod dependency, existing Supabase clients, Gemini REST `generateContent`, Gemini embedding model, Supabase pgvector. `{files: 11 created/modified, LOC/file: advisor.ts ~260, gemini.ts ~130, route.ts ~85, ai-advisor.tsx ~190, globals.css +180, migration ~90, tests ~260 total, deps: 0}`

---

## Mockup Review

- Source reviewed: `/Users/camiloecheverri/Documents/AI/AYRA MASTER/Stellar /docs/superpowers/mockups/allocation-wall.html`.
- The mockup already defines `Screen 04 - Chatbot - H8` as `Ask the Wall`, with citations, suggested questions, a floating pill, and a Gemini-backed wiring note.
- The mockup public chatbot is visually light/white, but the current AYRA app public shell is black. Implement the advisor with `var(--public-bg)`, `var(--public-panel)`, `var(--dark-rule)`, and `var(--public-fg)`, not the white `chat-panel` treatment from the standalone mockup.
- The mockup says the bot declines quantitative questions. The requested product behavior requires the opposite for funding questions: it must answer amounts paid, submitted, settled, and funded, but only when those numbers come from current public projections and are cited.
- The advisor also needs Stellar-facing explanations for transaction hashes: how to watch them, what they mean, where they resolve, and what grantees should ask about when they want to trace a payment publicly.
- The mockup lists `text-embedding-004`; current Gemini docs list `gemini-embedding-001` for embeddings, with configurable output dimensions. Use `gemini-embedding-001` at 768 dimensions for pgvector.
- Current Gemini structured-output docs show `generateContent` supports JSON response schemas. Use structured JSON for answer, citations, followups, and status.

## File Map

- Create `src/lib/ayra/advisor.ts`: pure public source-pack builder, response schemas, prompt builder, response validation, deterministic fallback.
- Create `src/lib/ayra/gemini.ts`: server-only Gemini REST client with structured output, no SDK dependency.
- Create `src/app/api/advisor/route.ts`: validates requests, loads public AYRA state, retrieves public sources, calls Gemini, falls back safely.
- Create `src/components/ayra/ai-advisor.tsx`: black embedded advisor UI with floating launcher, suggested prompts, cited answers, loading/error states.
- Modify `src/app/page.tsx`: mount advisor on public overview with track route context.
- Modify `src/app/projects/[trackSlug]/[initiativeSlug]/page.tsx`: mount advisor with track and initiative context.
- Modify `src/app/globals.css`: black advisor panel styles, responsive behavior, focus states, mobile safe dimensions.
- Modify `.env.example`: add Gemini model/key config and embedding dimensions.
- Create `supabase/migrations/0009_advisor_sources.sql`: vector source table and safe match RPC for longer public AYRA documentation.
- Create `tests/ayra-advisor.test.ts`: public facts, funding totals, citation validation, privacy checks.
- Create `tests/ayra-gemini.test.ts`: Gemini request-body shape and response extraction without network calls.
- Create `tests/e2e/ayra-advisor.spec.ts`: browser smoke for embedded advisor on black public pages.

## External Docs Checked

- Gemini `generateContent` REST endpoint and streaming endpoint: https://ai.google.dev/api/generate-content
- Gemini structured JSON output: https://ai.google.dev/gemini-api/docs/structured-output
- Gemini embeddings model and dimensions: https://ai.google.dev/gemini-api/docs/embeddings
- Supabase vector columns and RPC pattern: https://supabase.com/docs/guides/ai/vector-columns
- Supabase vector indexes and dimensional limits: https://supabase.com/docs/guides/ai/vector-indexes

## Global Constraints

- Public advisor context must use `loadPublicAyraState()` and public domain projections. It must not use operator state, profiles, user roles, applications, private receipts, payout addresses, internal notes, or raw storage paths.
- The browser must never receive `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, SDP auth values, payout addresses, private receipt paths, private phone numbers, or emails.
- Advisor answers must include citations from known source IDs. If Gemini returns unknown citations, filter them out. If no usable citation remains, return a grounded decline.
- Funding answers must use the exact public labels already in the app: submitted batches are `In flight`; settled batches are `Cleared`.
- Stellar trace answers must stay public-safe: explain transaction-hash behavior, where a hash can be watched, and how it maps to public proof without inventing private routing or hidden payment destinations.
- Keep the advisor black. Do not add a white modal, glass panel, pastel gradient, or nested cards.
- No new package dependencies. Use `fetch` against Gemini REST and existing `zod`.
- Preserve current route split: `/` stays overview/project-entry only; detailed proof stays on `/projects/[trackSlug]/[initiativeSlug]` and `/proof/[batchId]`.

## Task 1: Advisor Contract Tests

**Files:**
- Create: `tests/ayra-advisor.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/ayra-advisor.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAdvisorPrompt,
  buildAdvisorSources,
  fallbackAdvisorAnswer,
  normalizeAdvisorAnswer,
} from "../src/lib/ayra/advisor";
import { createDemoState } from "../src/lib/ayra/domain";

describe("AYRA advisor public source contract", () => {
  it("builds funding facts from public projections only", () => {
    const sources = buildAdvisorSources(createDemoState(), {
      trackSlug: "providencia",
      initiativeSlug: "reforestation",
    });
    const funding = sources.find(
      (source) => source.id === "funding:providencia:reforestation",
    );

    assert.ok(funding);
    assert.match(funding.content, /visible batch volume: 44,200 USDC/i);
    assert.match(funding.content, /settled total: 30,000 USDC/i);
    assert.match(funding.content, /in flight total: 14,200 USDC/i);
    assert.match(funding.href ?? "", /\/projects\/providencia\/reforestation/);
  });

  it("builds stellar trace facts for transaction-hash questions", () => {
    const sources = buildAdvisorSources(createDemoState(), {
      trackSlug: "providencia",
      initiativeSlug: "reforestation",
    });
    const stellar = sources.find(
      (source) => source.id === "stellar:providencia:reforestation",
    );

    assert.ok(stellar);
    assert.match(stellar.content, /transaction hash/i);
    assert.match(stellar.content, /watch/i);
    assert.match(stellar.content, /proof pack/i);
    assert.match(stellar.content, /Stellar/i);
  });

  it("does not include private records in any source text", () => {
    const serialized = JSON.stringify(buildAdvisorSources(createDemoState(), {}));

    assert.doesNotMatch(serialized, /leidy@ecoparque\.co/i);
    assert.doesNotMatch(serialized, /receipts\/batch-reforest-apr26\/crew\.pdf/i);
    assert.doesNotMatch(serialized, /GBLEIDYECOPARQUE/i);
    assert.doesNotMatch(serialized, /\+57 300 000 0000/i);
    assert.doesNotMatch(serialized, /profile-admin/i);
  });

  it("normalizes Gemini answers to known citations only", () => {
    const sources = buildAdvisorSources(createDemoState(), {
      trackSlug: "providencia",
      initiativeSlug: "reforestation",
    });
    const response = normalizeAdvisorAnswer(
      {
        answer:
          "Reforestation has 30,000 USDC cleared and 14,200 USDC in flight.",
        citations: [
          {
            sourceId: "funding:providencia:reforestation",
            label: "Funding - Reforestation",
          },
          { sourceId: "unknown", label: "Unknown" },
        ],
        followups: ["Show me the proof pack"],
        status: "answered",
      },
      sources,
    );

    assert.equal(response.status, "answered");
    assert.deepEqual(
      response.citations.map((citation) => citation.sourceId),
      ["funding:providencia:reforestation"],
    );
  });

  it("falls back deterministically for paid amount questions", () => {
    const sources = buildAdvisorSources(createDemoState(), {
      trackSlug: "providencia",
      initiativeSlug: "reforestation",
    });
    const response = fallbackAdvisorAnswer(
      "How much has been paid for Reforestation?",
      sources,
    );

    assert.equal(response.status, "answered");
    assert.match(response.answer, /30,000 USDC/);
    assert.match(response.answer, /Cleared/);
    assert.equal(response.citations[0]?.sourceId, "funding:providencia:reforestation");
  });

  it("falls back deterministically for Stellar transaction-hash questions", () => {
    const sources = buildAdvisorSources(createDemoState(), {
      trackSlug: "providencia",
      initiativeSlug: "reforestation",
    });
    const response = fallbackAdvisorAnswer(
      "How do I watch the transaction hash and where can it go?",
      sources,
    );

    assert.equal(response.status, "answered");
    assert.match(response.answer, /transaction hash/i);
    assert.match(response.answer, /proof pack/i);
    assert.match(response.answer, /Stellar/i);
    assert.equal(
      response.citations[0]?.sourceId,
      "stellar:providencia:reforestation",
    );
  });

  it("builds a compact prompt that includes source IDs and privacy rules", () => {
    const sources = buildAdvisorSources(createDemoState(), {
      trackSlug: "providencia",
      initiativeSlug: "reforestation",
    });
    const prompt = buildAdvisorPrompt("What does cleared mean?", sources);

    assert.match(prompt, /SOURCE ID: funding:providencia:reforestation/);
    assert.match(prompt, /SOURCE ID: stellar:providencia:reforestation/);
    assert.match(prompt, /Do not reveal private contacts/i);
    assert.match(prompt, /Explain transaction hashes/i);
    assert.match(prompt, /Question: What does cleared mean\?/);
    assert.ok(prompt.length < 15000);
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run:

```bash
npx tsx --test tests/ayra-advisor.test.ts
```

Expected: FAIL because `src/lib/ayra/advisor.ts` does not exist.

- [ ] **Step 3: Commit the failing tests**

```bash
git add tests/ayra-advisor.test.ts
git commit -m "test: define public ayra advisor contract"
```

## Task 2: Public Advisor Source Pack

**Files:**
- Create: `src/lib/ayra/advisor.ts`
- Test: `tests/ayra-advisor.test.ts`

- [ ] **Step 1: Create the pure advisor source module**

Create `src/lib/ayra/advisor.ts`:

```ts
import { z } from "zod";

import {
  formatUsdc,
  getPublicInitiativeProjection,
  getPublicWallProjection,
  type AyraState,
  type BatchStatus,
} from "@/lib/ayra/domain";

export type AdvisorRouteContext = {
  trackSlug?: string;
  initiativeSlug?: string;
};

export type AdvisorSource = {
  id: string;
  title: string;
  href?: string;
  trackSlug?: string;
  initiativeSlug?: string;
  content: string;
};

export type AdvisorCitation = {
  sourceId: string;
  label: string;
  href?: string;
};

export type AdvisorAnswer = {
  answer: string;
  citations: AdvisorCitation[];
  followups: string[];
  status: "answered" | "grounded_decline";
};

export const advisorRequestSchema = z.object({
  question: z.string().trim().min(3).max(600),
  route: z
    .object({
      trackSlug: z.string().trim().min(1).max(80).optional(),
      initiativeSlug: z.string().trim().min(1).max(80).optional(),
    })
    .optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "advisor"]),
        text: z.string().trim().min(1).max(1200),
      }),
    )
    .max(6)
    .optional(),
});

const rawAdvisorAnswerSchema = z.object({
  answer: z.string().trim().min(1).max(1800),
  citations: z
    .array(
      z.object({
        sourceId: z.string().trim().min(1).max(180),
        label: z.string().trim().min(1).max(120),
      }),
    )
    .max(6),
  followups: z.array(z.string().trim().min(1).max(120)).max(4),
  status: z.enum(["answered", "grounded_decline"]),
});

export const ADVISOR_RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    answer: {
      type: "string",
      description:
        "A concise public answer grounded only in provided AYRA source facts.",
    },
    citations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          sourceId: {
            type: "string",
            description: "A source ID copied exactly from the source pack.",
          },
          label: {
            type: "string",
            description: "Short citation label shown as a chip.",
          },
        },
        required: ["sourceId", "label"],
      },
    },
    followups: {
      type: "array",
      items: { type: "string" },
      description: "Short suggested next questions.",
    },
    status: {
      type: "string",
      enum: ["answered", "grounded_decline"],
      description: "Use grounded_decline when sources do not support an answer.",
    },
  },
  required: ["answer", "citations", "followups", "status"],
} as const;

const leakPattern =
  /(receipts\/|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\+\d{1,3}\s?\d{3}|\bG[A-Z0-9]{20,}\b)/i;

function source(input: AdvisorSource): AdvisorSource {
  if (leakPattern.test(input.content)) {
    throw new Error(`Advisor source contains private-looking content: ${input.id}`);
  }
  return input;
}

function numberFormat(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function publicLabel(status: BatchStatus) {
  return status === "settled" ? "Cleared" : "In flight";
}

export function buildAdvisorSources(
  state: AyraState,
  route: AdvisorRouteContext = {},
): AdvisorSource[] {
  const sources: AdvisorSource[] = [
    source({
      id: "ayra:public-boundary",
      title: "AYRA public proof boundary",
      href: "/privacy",
      content:
        "AYRA public surfaces show approved updates, project summaries, category-level spend, submitted or settled public batches, and proof links. Public surfaces do not show private contacts, raw receipt files, payout addresses, failed payment details, or internal reconciliation notes.",
    }),
    source({
      id: "ayra:payment-language",
      title: "AYRA payment language",
      content:
        "AYRA public payment labels use In flight for submitted batches and Cleared for settled batches. Funding numbers must come from public batch and line-item totals, not estimates.",
    }),
    source({
      id: "stellar:trace-rules",
      title: "Stellar trace rules",
      href: "/proof/batch-reforest-mar26",
      content:
        "Transaction hashes are public ledger references that help people trace a payment from the advisor, the proof pack, and the public project page into the Stellar explorer. A grantee should ask where the hash is shown, which proof pack it belongs to, and whether the batch is In flight or Cleared. Do not invent private route details or hidden recipients.",
    }),
  ];

  const preferredTrackSlug = route.trackSlug ?? "providencia";
  const preferredWall = getPublicWallProjection(state, preferredTrackSlug);

  for (const track of state.tracks) {
    const wall = getPublicWallProjection(state, track.slug);
    sources.push(
      source({
        id: `track:${track.slug}`,
        title: `Track - ${track.name}`,
        href: `/?track=${track.slug}`,
        trackSlug: track.slug,
        content: `${track.name} is an AYRA track with ${wall.initiatives.length} public initiative(s). Local currency for local snapshots is ${track.localCurrency}. The public track theme is ${track.theme}.`,
      }),
    );

    for (const initiative of wall.initiatives) {
      const project = getPublicInitiativeProjection(
        state,
        track.slug,
        initiative.slug,
      );
      const totalVisible = project.batches.reduce(
        (sum, batch) => sum + batch.amountUsdc,
        0,
      );
      const settledTotal = project.batches
        .filter((batch) => batch.status === "settled")
        .reduce((sum, batch) => sum + batch.amountUsdc, 0);
      const inFlightTotal = project.batches
        .filter((batch) => batch.status === "submitted")
        .reduce((sum, batch) => sum + batch.amountUsdc, 0);
      const batchSummary =
        project.batches
          .map(
            (batch) =>
              `${batch.periodLabel}: ${formatUsdc(batch.amountUsdc)} ${publicLabel(batch.status)}`,
          )
          .join("; ") || "No submitted or settled public batches yet.";
      const categories =
        project.spending
          .map((item) => `${item.category}: ${formatUsdc(item.amountUsdc)}`)
          .join("; ") || "No public category spend yet.";

      sources.push(
        source({
          id: `project:${track.slug}:${initiative.slug}`,
          title: `Project - ${initiative.name}`,
          href: `/projects/${track.slug}/${initiative.slug}`,
          trackSlug: track.slug,
          initiativeSlug: initiative.slug,
          content: `${initiative.name} is an AYRA project in ${track.name}. Headline: ${initiative.headline}. Description: ${initiative.description}. Public steward name: ${initiative.stewardName ?? "not published"}. Progress: ${numberFormat(initiative.targetMetricCurrent)} of ${numberFormat(initiative.targetMetricGoal)} ${initiative.targetMetricLabel}. League score: ${initiative.leagueScore} of 99. Status: ${initiative.status}.`,
        }),
        source({
          id: `funding:${track.slug}:${initiative.slug}`,
          title: `Funding - ${initiative.name}`,
          href: `/projects/${track.slug}/${initiative.slug}`,
          trackSlug: track.slug,
          initiativeSlug: initiative.slug,
          content: `${initiative.name} funding in ${track.name}. Visible batch volume: ${formatUsdc(totalVisible)}. Settled total: ${formatUsdc(settledTotal)}. In flight total: ${formatUsdc(inFlightTotal)}. Public batches: ${batchSummary}. Public category spend: ${categories}.`,
        }),
        source({
          id: `stellar:${track.slug}:${initiative.slug}`,
          title: `Stellar trace - ${initiative.name}`,
          href: `/projects/${track.slug}/${initiative.slug}`,
          trackSlug: track.slug,
          initiativeSlug: initiative.slug,
          content: `${initiative.name} Stellar tracing in ${track.name}. Transaction hashes are public references that can be watched from the proof pack or public project page. The hash identifies a payment record, the proof pack shows the batch context, and the Stellar explorer is the final public check for the chain record. Grantees can ask which batch the hash belongs to, whether the payment is In flight or Cleared, and where the proof link resolves.`,
        }),
      );

      for (const batch of project.batches) {
        sources.push(
          source({
            id: `proof:${batch.id}`,
            title: `Proof - ${batch.code}`,
            href: `/proof/${batch.id}`,
            trackSlug: track.slug,
            initiativeSlug: initiative.slug,
            content: `${batch.code} is a public proof batch for ${initiative.name}. Period: ${batch.periodLabel}. Amount: ${formatUsdc(batch.amountUsdc)}. Public status: ${publicLabel(batch.status)}. Sponsor: ${batch.sponsorName ?? "not published"}.`,
          }),
        );
      }
    }
  }

  return prioritizeSources(sources, {
    trackSlug: preferredWall.track.slug,
    initiativeSlug: route.initiativeSlug,
  });
}

function prioritizeSources(
  sources: AdvisorSource[],
  route: AdvisorRouteContext,
) {
  return [...sources].sort((a, b) => {
    const aScore = scoreSource(a, route);
    const bScore = scoreSource(b, route);
    return bScore - aScore;
  });
}

function scoreSource(sourceItem: AdvisorSource, route: AdvisorRouteContext) {
  let score = 0;
  if (sourceItem.trackSlug && sourceItem.trackSlug === route.trackSlug) score += 4;
  if (
    sourceItem.initiativeSlug &&
    sourceItem.initiativeSlug === route.initiativeSlug
  ) {
    score += 8;
  }
  if (sourceItem.id.startsWith("funding:")) score += 2;
  if (sourceItem.id === "ayra:public-boundary") score += 1;
  return score;
}

export function buildAdvisorPrompt(question: string, sources: AdvisorSource[]) {
  const sourcePack = sources
    .slice(0, 18)
    .map(
      (item) =>
        `SOURCE ID: ${item.id}\nTITLE: ${item.title}\nHREF: ${item.href ?? ""}\nFACTS: ${item.content}`,
    )
    .join("\n\n");

  return [
    "You are the AYRA public advisor embedded in the transparency app.",
    "Answer only from the source pack below.",
    "Do not reveal private contacts, emails, phone numbers, payout addresses, raw receipt paths, failed payment details, or internal reconciliation notes.",
    "For funding questions, answer exact public totals when the source pack provides them. Use the terms Cleared and In flight.",
    "For Stellar questions, explain transaction hashes in plain public language: how to watch them, what they do, where they resolve, and which proof pack or explorer page to open.",
    "If the sources do not support the answer, set status to grounded_decline and say what public page to inspect instead.",
    "Every answered response must cite one to three source IDs copied exactly from the source pack.",
    "",
    sourcePack,
    "",
    `Question: ${question}`,
  ].join("\n");
}

export function normalizeAdvisorAnswer(
  input: unknown,
  sources: AdvisorSource[],
): AdvisorAnswer {
  const parsed = rawAdvisorAnswerSchema.safeParse(input);
  if (!parsed.success) {
    return groundedDecline("I could not verify that answer against AYRA public sources.");
  }

  if (leakPattern.test(parsed.data.answer)) {
    return groundedDecline("I cannot share private AYRA operational details.");
  }

  const byId = new Map(sources.map((item) => [item.id, item]));
  const citations = parsed.data.citations
    .filter((citation) => byId.has(citation.sourceId))
    .slice(0, 3)
    .map((citation) => ({
      ...citation,
      href: byId.get(citation.sourceId)?.href,
    }));

  if (parsed.data.status === "answered" && citations.length === 0) {
    return groundedDecline("I need a public AYRA source before I can answer that.");
  }

  return {
    answer: parsed.data.answer,
    citations,
    followups: parsed.data.followups.slice(0, 4),
    status: parsed.data.status,
  };
}

export function fallbackAdvisorAnswer(
  question: string,
  sources: AdvisorSource[],
): AdvisorAnswer {
  const lowered = question.toLowerCase();
  const asksFunding =
    /\b(paid|settled|cleared|funded|funding|money|amount|batch|sponsor)\b/.test(
      lowered,
    );
  const asksStellar =
    /\b(stellar|transaction hash|tx hash|hash|ledger|explorer|watch|trace|payment track|where can it go)\b/.test(
      lowered,
    );
  const fundingSource =
    sources.find((item) => item.id.startsWith("funding:")) ??
    sources.find((item) => item.id === "ayra:payment-language");
  const stellarSource =
    sources.find((item) => item.id.startsWith("stellar:")) ??
    sources.find((item) => item.id === "stellar:trace-rules");

  if (asksFunding && fundingSource) {
    return {
      answer: fundingSource.content,
      citations: [
        {
          sourceId: fundingSource.id,
          label: fundingSource.title,
          href: fundingSource.href,
        },
      ],
      followups: [
        "Show me the proof pack",
        "Which batches are cleared?",
        "What does In flight mean?",
      ],
      status: "answered",
    };
  }

  if (asksStellar && stellarSource) {
    return {
      answer: stellarSource.content,
      citations: [
        {
          sourceId: stellarSource.id,
          label: stellarSource.title,
          href: stellarSource.href,
        },
      ],
      followups: [
        "Show me the proof pack",
        "Which batch does this hash belong to?",
        "Is this payment Cleared or In flight?",
      ],
      status: "answered",
    };
  }

  return groundedDecline(
    "I can answer from AYRA public proof, project, funding, and Stellar trace records once Gemini is configured for this environment.",
  );
}

function groundedDecline(answer: string): AdvisorAnswer {
  return {
    answer,
    citations: [],
    followups: [
      "What is AYRA funding?",
      "How do public proof packs work?",
      "How do I become a sponsor?",
      "How do I watch a transaction hash?",
    ],
    status: "grounded_decline",
  };
}
```

- [ ] **Step 2: Run the advisor tests**

Run:

```bash
npx tsx --test tests/ayra-advisor.test.ts
```

Expected: PASS.

- [ ] **Step 3: Commit the source pack**

```bash
git add src/lib/ayra/advisor.ts tests/ayra-advisor.test.ts
git commit -m "feat: add public ayra advisor source pack"
```

## Task 3: Gemini REST Boundary

**Files:**
- Create: `src/lib/ayra/gemini.ts`
- Create: `tests/ayra-gemini.test.ts`
- Modify: `.env.example`

- [ ] **Step 1: Write Gemini boundary tests**

Create `tests/ayra-gemini.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildGeminiRequestBody,
  extractGeminiText,
  geminiEndpoint,
} from "../src/lib/ayra/gemini";

describe("Gemini advisor boundary", () => {
  it("builds a structured JSON Gemini request without exposing the API key", () => {
    const body = buildGeminiRequestBody("system", "prompt");
    const serialized = JSON.stringify(body);

    assert.equal(body.systemInstruction.parts[0]?.text, "system");
    assert.equal(body.contents[0]?.parts[0]?.text, "prompt");
    assert.equal(
      body.generationConfig.responseFormat.text.mimeType,
      "application/json",
    );
    assert.doesNotMatch(serialized, /GEMINI_API_KEY/);
  });

  it("builds the REST endpoint from model only", () => {
    assert.equal(
      geminiEndpoint("gemini-3.5-flash"),
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
    );
  });

  it("extracts candidate text from Gemini responses", () => {
    const text = extractGeminiText({
      candidates: [
        {
          content: {
            parts: [{ text: "{\"answer\":\"ok\"}" }],
          },
        },
      ],
    });

    assert.equal(text, "{\"answer\":\"ok\"}");
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run:

```bash
npx tsx --test tests/ayra-gemini.test.ts
```

Expected: FAIL because `src/lib/ayra/gemini.ts` does not exist.

- [ ] **Step 3: Implement the Gemini REST client**

Create `src/lib/ayra/gemini.ts`:

```ts
import {
  ADVISOR_RESPONSE_JSON_SCHEMA,
  buildAdvisorPrompt,
  normalizeAdvisorAnswer,
  type AdvisorAnswer,
  type AdvisorSource,
} from "@/lib/ayra/advisor";

type GeminiPart = { text?: string };
type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
    finishReason?: string;
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
};

export function hasGeminiEnv() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function geminiModel() {
  return process.env.GEMINI_MODEL || "gemini-3.5-flash";
}

export function geminiEndpoint(model: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

export function buildGeminiRequestBody(
  systemInstruction: string,
  prompt: string,
) {
  return {
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 900,
      responseFormat: {
        text: {
          mimeType: "application/json",
          schema: ADVISOR_RESPONSE_JSON_SCHEMA,
        },
      },
    },
  } as const;
}

export function extractGeminiText(payload: GeminiResponse) {
  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!text) {
    const reason =
      payload.promptFeedback?.blockReason ??
      payload.candidates?.[0]?.finishReason ??
      "empty_response";
    throw new Error(`Gemini advisor response was empty: ${reason}`);
  }
  return text;
}

export async function generateGeminiAdvisorAnswer({
  question,
  sources,
  fetcher = fetch,
}: {
  question: string;
  sources: AdvisorSource[];
  fetcher?: typeof fetch;
}): Promise<AdvisorAnswer> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured.");

  const systemInstruction =
    "You are AYRA's public transparency advisor. Return only valid JSON matching the response schema.";
  const prompt = buildAdvisorPrompt(question, sources);
  const response = await fetcher(geminiEndpoint(geminiModel()), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key,
    },
    body: JSON.stringify(buildGeminiRequestBody(systemInstruction, prompt)),
  });

  if (!response.ok) {
    throw new Error(`Gemini advisor request failed with ${response.status}.`);
  }

  const text = extractGeminiText((await response.json()) as GeminiResponse);
  return normalizeAdvisorAnswer(JSON.parse(text), sources);
}
```

- [ ] **Step 4: Add environment documentation**

Modify `.env.example` by appending:

```bash
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
GEMINI_EMBEDDING_DIMENSIONS=768
```

- [ ] **Step 5: Run the Gemini boundary tests**

Run:

```bash
npx tsx --test tests/ayra-gemini.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the Gemini boundary**

```bash
git add src/lib/ayra/gemini.ts tests/ayra-gemini.test.ts .env.example
git commit -m "feat: add gemini advisor boundary"
```

## Task 4: Advisor API Route

**Files:**
- Create: `src/app/api/advisor/route.ts`
- Modify: `tests/ayra-advisor.test.ts`

- [ ] **Step 1: Add a route-level fallback test**

Append to `tests/ayra-advisor.test.ts`:

```ts
import { POST } from "../src/app/api/advisor/route";

describe("AYRA advisor API route", () => {
  it("returns deterministic funding answers when Gemini is not configured", async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const response = await POST(
      new Request("http://localhost/api/advisor", {
        method: "POST",
        body: JSON.stringify({
          question: "How much has been paid for Reforestation?",
          route: { trackSlug: "providencia", initiativeSlug: "reforestation" },
        }),
      }),
    );
    const body = await response.json();

    process.env.GEMINI_API_KEY = originalKey;

    assert.equal(response.status, 200);
    assert.equal(body.mode, "deterministic-fallback");
    assert.match(body.answer, /30,000 USDC/);
    assert.equal(body.citations[0]?.sourceId, "funding:providencia:reforestation");
  });

  it("returns deterministic Stellar trace answers when Gemini is not configured", async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const response = await POST(
      new Request("http://localhost/api/advisor", {
        method: "POST",
        body: JSON.stringify({
          question: "How do I watch the transaction hash?",
          route: { trackSlug: "providencia", initiativeSlug: "reforestation" },
        }),
      }),
    );
    const body = await response.json();

    process.env.GEMINI_API_KEY = originalKey;

    assert.equal(response.status, 200);
    assert.equal(body.mode, "deterministic-fallback");
    assert.match(body.answer, /transaction hash/i);
    assert.match(body.answer, /Stellar/i);
    assert.equal(body.citations[0]?.sourceId, "stellar:providencia:reforestation");
  });

  it("rejects malformed advisor requests", async () => {
    const response = await POST(
      new Request("http://localhost/api/advisor", {
        method: "POST",
        body: JSON.stringify({ question: "" }),
      }),
    );

    assert.equal(response.status, 400);
  });
});
```

- [ ] **Step 2: Run the route test and verify it fails**

Run:

```bash
npx tsx --test tests/ayra-advisor.test.ts
```

Expected: FAIL because `/api/advisor` does not exist.

- [ ] **Step 3: Implement the route handler**

Create `src/app/api/advisor/route.ts`:

```ts
import { NextResponse } from "next/server";

import {
  advisorRequestSchema,
  buildAdvisorSources,
  fallbackAdvisorAnswer,
} from "@/lib/ayra/advisor";
import { loadPublicAyraState } from "@/lib/ayra/data";
import { generateGeminiAdvisorAnswer, hasGeminiEnv } from "@/lib/ayra/gemini";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "advisor_invalid_json" },
      { status: 400 },
    );
  }

  const parsed = advisorRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "advisor_invalid_request" },
      { status: 400 },
    );
  }

  const state = await loadPublicAyraState();
  const sources = buildAdvisorSources(state, parsed.data.route ?? {});

  if (!hasGeminiEnv()) {
    return NextResponse.json({
      ...fallbackAdvisorAnswer(parsed.data.question, sources),
      mode: "deterministic-fallback",
    });
  }

  try {
    return NextResponse.json({
      ...(await generateGeminiAdvisorAnswer({
        question: parsed.data.question,
        sources,
      })),
      mode: "gemini",
    });
  } catch (error) {
    console.error("AYRA advisor Gemini request failed.");
    return NextResponse.json({
      ...fallbackAdvisorAnswer(parsed.data.question, sources),
      mode: "deterministic-fallback",
    });
  }
}
```

- [ ] **Step 4: Run the route tests**

Run:

```bash
npx tsx --test tests/ayra-advisor.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the API route**

```bash
git add src/app/api/advisor/route.ts tests/ayra-advisor.test.ts
git commit -m "feat: add public ayra advisor api"
```

## Task 5: Black Embedded Advisor UI

**Files:**
- Create: `src/components/ayra/ai-advisor.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/projects/[trackSlug]/[initiativeSlug]/page.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Create the client component**

Create `src/components/ayra/ai-advisor.tsx`:

```tsx
"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Bot, Send, X } from "lucide-react";

type AdvisorMessage = {
  role: "user" | "advisor";
  text: string;
  citations?: Array<{ sourceId: string; label: string; href?: string }>;
};

type Props = {
  trackSlug?: string;
  initiativeSlug?: string;
};

const baseSuggestions = [
  "What is AYRA funding?",
  "How much has been paid?",
  "Which batches are cleared?",
  "How do proof packs work?",
];

export function AiAdvisor({ trackSlug, initiativeSlug }: Props) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<AdvisorMessage[]>([
    {
      role: "advisor",
      text:
        "Ask about AYRA, projects, funding, cleared batches, proof packs, sponsorship, or Stellar transaction hashes. I answer from public records only.",
    },
  ]);
  const [isPending, startTransition] = useTransition();
  const suggestions = useMemo(
    () =>
      initiativeSlug
        ? [
            "How much has been paid?",
            "What is in flight?",
            "Show the proof pack",
            "Who is the project steward?",
            "How do I watch the transaction hash?",
          ]
        : baseSuggestions,
    [initiativeSlug],
  );

  function ask(nextQuestion: string) {
    const trimmed = nextQuestion.trim();
    if (!trimmed || isPending) return;

    setQuestion("");
    setMessages((current) => [...current, { role: "user", text: trimmed }]);

    startTransition(async () => {
      try {
        const response = await fetch("/api/advisor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: trimmed,
            route: { trackSlug, initiativeSlug },
          }),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "advisor_failed");
        setMessages((current) => [
          ...current,
          {
            role: "advisor",
            text: body.answer,
            citations: body.citations,
          },
        ]);
      } catch {
        setMessages((current) => [
          ...current,
          {
            role: "advisor",
            text:
              "I could not reach the AYRA advisor right now. The public project and proof pages still show the verified records.",
          },
        ]);
      }
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(question);
  }

  return (
    <section className="ai-advisor" aria-label="AYRA advisor">
      <button
        aria-expanded={open}
        className="ai-advisor-pill"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="ai-advisor-pulse" />
        <Bot className="h-4 w-4" />
        Ask AYRA
      </button>

      {open ? (
        <aside className="ai-advisor-panel" aria-label="AYRA AI advisor panel">
          <div className="ai-advisor-head">
            <div>
              <p>AYRA advisor</p>
              <span>Gemini-backed. Public records only.</span>
            </div>
            <button
              aria-label="Close AYRA advisor"
              className="ai-advisor-icon"
              onClick={() => setOpen(false)}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="ai-advisor-messages" aria-live="polite">
            {messages.map((message, index) => (
              <article
                className={`ai-advisor-message ${message.role}`}
                key={`${message.role}-${index}`}
              >
                <p>{message.text}</p>
                {message.citations?.length ? (
                  <div className="ai-advisor-citations">
                    {message.citations.map((citation) =>
                      citation.href ? (
                        <Link href={citation.href} key={citation.sourceId}>
                          {citation.label}
                        </Link>
                      ) : (
                        <span key={citation.sourceId}>{citation.label}</span>
                      ),
                    )}
                  </div>
                ) : null}
              </article>
            ))}
            {isPending ? (
              <article className="ai-advisor-message advisor">
                <p>Reading the public wall...</p>
              </article>
            ) : null}
          </div>

          <div className="ai-advisor-suggestions">
            {suggestions.map((item) => (
              <button key={item} onClick={() => ask(item)} type="button">
                {item}
              </button>
            ))}
          </div>

          <form className="ai-advisor-form" onSubmit={onSubmit}>
            <input
              aria-label="Ask AYRA"
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask about projects, funding, proof, or transaction hashes..."
              value={question}
            />
            <button aria-label="Send question" disabled={isPending} type="submit">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </aside>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 2: Mount it on the public overview**

Modify `src/app/page.tsx`:

```tsx
import { AiAdvisor } from "@/components/ayra/ai-advisor";
```

Add this before `<SiteFooter />`:

```tsx
<AiAdvisor trackSlug={wall.track.slug} />
```

- [ ] **Step 3: Mount it on project detail pages**

Modify `src/app/projects/[trackSlug]/[initiativeSlug]/page.tsx`:

```tsx
import { AiAdvisor } from "@/components/ayra/ai-advisor";
```

Add this before `<SiteFooter />`:

```tsx
<AiAdvisor
  initiativeSlug={project.initiative.slug}
  trackSlug={project.track.slug}
/>
```

- [ ] **Step 4: Add black advisor styles**

Append to `src/app/globals.css`:

```css
.ai-advisor {
  position: relative;
  z-index: 45;
}

.ai-advisor-pill {
  align-items: center;
  background: var(--public-fg);
  border: 1px solid color-mix(in oklab, var(--public-leaf) 65%, transparent);
  border-radius: 999px;
  bottom: 18px;
  box-shadow: 0 18px 48px oklch(0% 0 0 / 0.38);
  color: var(--public-bg);
  display: inline-flex;
  font-size: 14px;
  font-weight: 600;
  gap: 8px;
  min-height: 46px;
  padding: 0 16px;
  position: fixed;
  right: 18px;
}

.ai-advisor-pulse {
  background: var(--public-leaf);
  border-radius: 999px;
  box-shadow: 0 0 0 0 color-mix(in oklab, var(--public-leaf) 60%, transparent);
  height: 8px;
  width: 8px;
  animation: advisor-pulse 1.8s ease-out infinite;
}

@keyframes advisor-pulse {
  0% {
    box-shadow: 0 0 0 0 color-mix(in oklab, var(--public-leaf) 60%, transparent);
  }
  70% {
    box-shadow: 0 0 0 9px transparent;
  }
  100% {
    box-shadow: 0 0 0 0 transparent;
  }
}

.ai-advisor-panel {
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--public-panel-strong) 92%, black), var(--public-bg-low)),
    var(--public-panel);
  border: 1px solid var(--dark-rule);
  bottom: 78px;
  box-shadow: 0 32px 80px oklch(0% 0 0 / 0.52);
  color: var(--public-fg);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto auto;
  max-height: min(720px, calc(100dvh - 106px));
  max-width: calc(100vw - 36px);
  min-height: 560px;
  position: fixed;
  right: 18px;
  width: min(460px, calc(100vw - 36px));
}

.ai-advisor-head {
  align-items: center;
  border-bottom: 1px solid var(--dark-rule);
  display: flex;
  gap: 16px;
  justify-content: space-between;
  padding: 16px 18px;
}

.ai-advisor-head p {
  color: var(--public-fg);
  font-family: var(--font-display), ui-sans-serif;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.1;
  margin: 0;
}

.ai-advisor-head span {
  color: var(--public-dim);
  display: block;
  font-size: 12px;
  margin-top: 4px;
}

.ai-advisor-icon {
  align-items: center;
  border: 1px solid var(--dark-rule);
  color: var(--public-muted);
  display: inline-flex;
  height: 38px;
  justify-content: center;
  width: 38px;
}

.ai-advisor-messages {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  padding: 16px 18px;
}

.ai-advisor-message {
  border: 1px solid var(--dark-rule);
  color: var(--public-muted);
  font-size: 14px;
  line-height: 1.55;
  padding: 12px 13px;
}

.ai-advisor-message.user {
  align-self: end;
  background: var(--public-fg);
  color: var(--public-bg);
  max-width: 82%;
}

.ai-advisor-message.advisor {
  align-self: start;
  background: color-mix(in oklab, var(--public-panel) 82%, black);
  max-width: 92%;
}

.ai-advisor-message p {
  margin: 0;
  overflow-wrap: anywhere;
}

.ai-advisor-citations {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.ai-advisor-citations a,
.ai-advisor-citations span {
  border: 1px solid color-mix(in oklab, var(--public-leaf) 45%, var(--dark-rule));
  color: var(--public-leaf);
  font-family: var(--font-mono), ui-monospace;
  font-size: 11px;
  padding: 4px 7px;
}

.ai-advisor-suggestions {
  border-top: 1px solid var(--dark-rule);
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 18px;
}

.ai-advisor-suggestions button {
  border: 1px solid var(--dark-rule);
  color: var(--public-muted);
  font-size: 12px;
  min-height: 34px;
  padding: 6px 9px;
}

.ai-advisor-suggestions button:hover {
  border-color: var(--public-leaf);
  color: var(--public-fg);
}

.ai-advisor-form {
  border-top: 1px solid var(--dark-rule);
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) 44px;
  padding: 14px 18px;
}

.ai-advisor-form input {
  background: var(--public-bg);
  border: 1px solid var(--dark-rule);
  color: var(--public-fg);
  min-height: 44px;
  min-width: 0;
  padding: 0 12px;
}

.ai-advisor-form input::placeholder {
  color: var(--public-dim);
}

.ai-advisor-form button {
  align-items: center;
  background: var(--public-leaf);
  color: var(--public-bg);
  display: inline-flex;
  justify-content: center;
  min-height: 44px;
}

.ai-advisor-form button:disabled {
  cursor: wait;
  opacity: 0.58;
}

@media (max-width: 640px) {
  .ai-advisor-pill {
    bottom: 14px;
    right: 14px;
  }

  .ai-advisor-panel {
    bottom: 70px;
    left: 14px;
    max-height: calc(100dvh - 92px);
    min-height: min(560px, calc(100dvh - 92px));
    right: 14px;
    width: auto;
  }
}
```

- [ ] **Step 5: Run lint and build**

Run:

```bash
npm run lint
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit the embedded UI**

```bash
git add src/components/ayra/ai-advisor.tsx src/app/page.tsx 'src/app/projects/[trackSlug]/[initiativeSlug]/page.tsx' src/app/globals.css
git commit -m "feat: embed black ayra advisor"
```

## Task 6: Supabase Vector Source Table

**Files:**
- Create: `supabase/migrations/0009_advisor_sources.sql`

- [ ] **Step 1: Create the pgvector migration**

Create `supabase/migrations/0009_advisor_sources.sql`:

```sql
create extension if not exists vector with schema extensions;

create table public.advisor_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  title text not null,
  href text,
  track_slug text,
  initiative_slug text,
  visibility text not null default 'public' check (visibility = 'public'),
  content text not null,
  content_hash text not null,
  embedding extensions.vector(768),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.advisor_sources enable row level security;

create policy advisor_sources_public_read
on public.advisor_sources
for select
to anon, authenticated
using (visibility = 'public');

create or replace function public.match_advisor_sources(
  query_embedding extensions.vector(768),
  match_threshold double precision,
  match_count integer,
  filter_track_slug text default null,
  filter_initiative_slug text default null
)
returns table (
  source_key text,
  title text,
  href text,
  track_slug text,
  initiative_slug text,
  content text,
  similarity double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    advisor_sources.source_key,
    advisor_sources.title,
    advisor_sources.href,
    advisor_sources.track_slug,
    advisor_sources.initiative_slug,
    advisor_sources.content,
    1 - (advisor_sources.embedding <=> query_embedding) as similarity
  from public.advisor_sources
  where advisor_sources.visibility = 'public'
    and advisor_sources.embedding is not null
    and (filter_track_slug is null or advisor_sources.track_slug is null or advisor_sources.track_slug = filter_track_slug)
    and (filter_initiative_slug is null or advisor_sources.initiative_slug is null or advisor_sources.initiative_slug = filter_initiative_slug)
    and 1 - (advisor_sources.embedding <=> query_embedding) > match_threshold
  order by advisor_sources.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_advisor_sources(
  extensions.vector(768),
  double precision,
  integer,
  text,
  text
) to anon, authenticated, service_role;
```

- [ ] **Step 2: Run migration validation locally**

Run:

```bash
npx supabase db reset
```

Expected: PASS. If local Supabase is not running in this checkout, record the failure and validate by applying the migration to a disposable Supabase branch before production.

- [ ] **Step 3: Commit the migration**

```bash
git add supabase/migrations/0009_advisor_sources.sql
git commit -m "feat: add advisor source vector table"
```

## Task 7: Browser Smoke

**Files:**
- Create: `tests/e2e/ayra-advisor.spec.ts`

- [ ] **Step 1: Write browser tests**

Create `tests/e2e/ayra-advisor.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("black AYRA advisor answers public funding questions", async ({ page }) => {
  await page.goto("/projects/providencia/reforestation");

  await expect(page.getByRole("button", { name: "Ask AYRA" })).toBeVisible();
  await page.getByRole("button", { name: "Ask AYRA" }).click();

  const advisor = page.getByRole("complementary", {
    name: "AYRA AI advisor panel",
  });
  await expect(advisor).toBeVisible();
  await expect(advisor).toContainText("Public records only");

  await page.getByRole("button", { name: "How much has been paid?" }).click();
  await expect(advisor).toContainText("30,000 USDC", { timeout: 30_000 });
  await expect(advisor).toContainText("Funding - Reforestation");

  await page.getByRole("button", { name: "How do I watch the transaction hash?" }).click();
  await expect(advisor).toContainText("transaction hash", { timeout: 30_000 });
  await expect(advisor).toContainText("Stellar");

  await expect(page.locator("body")).not.toContainText("leidy@ecoparque.co");
  await expect(page.locator("body")).not.toContainText(
    "receipts/batch-reforest-apr26/crew.pdf",
  );
  await expect(page.locator("body")).not.toContainText("GBLEIDYECOPARQUE");
});
```

- [ ] **Step 2: Run the e2e test**

Run:

```bash
npm run test:e2e -- tests/e2e/ayra-advisor.spec.ts
```

Expected: PASS with no Gemini key required because the API route uses deterministic fallback.

- [ ] **Step 3: Run the full verification bundle**

Run:

```bash
npm test
npm run lint
npm run build
npm run test:e2e
```

Expected: all pass.

- [ ] **Step 4: Commit browser coverage**

```bash
git add tests/e2e/ayra-advisor.spec.ts
git commit -m "test: cover ayra advisor browser flow"
```

## Task 8: Live Gemini Verification

**Files:**
- No required file changes unless the configured model needs to be changed in `.env.example`.

- [ ] **Step 1: Start the app with a Gemini key**

Run:

```bash
GEMINI_API_KEY="$GEMINI_API_KEY" npm run dev -- -p 3202
```

Expected: Next.js starts on `http://localhost:3202`.

- [ ] **Step 2: Verify the route directly**

Run:

```bash
curl -sS http://127.0.0.1:3202/api/advisor \
  -H 'Content-Type: application/json' \
  -d '{"question":"How much has been paid for Reforestation?","route":{"trackSlug":"providencia","initiativeSlug":"reforestation"}}'
```

Expected JSON includes:

```json
{
  "status": "answered",
  "mode": "gemini"
}
```

Also confirm the answer mentions `30,000 USDC` and cites `funding:providencia:reforestation`.

Also verify a Stellar trace question:

```bash
curl -sS http://127.0.0.1:3202/api/advisor \
  -H 'Content-Type: application/json' \
  -d '{"question":"How do I watch the transaction hash?","route":{"trackSlug":"providencia","initiativeSlug":"reforestation"}}'
```

Expected response mentions the public proof pack, the Stellar explorer, and `stellar:providencia:reforestation`.

- [ ] **Step 3: Verify the browser surface**

Open:

```text
http://127.0.0.1:3202/projects/providencia/reforestation
```

Browser checks:
- The advisor pill is black-page native, not a white modal.
- Suggested funding prompt returns an answer with a citation chip.
- Suggested Stellar trace prompt returns a hash-tracing answer with a citation chip.
- The answer does not reveal private email, phone, payout address, raw receipt path, failed payment details, or internal notes.
- Mobile viewport `390x844` keeps the panel inside the viewport.

- [ ] **Step 4: Commit any model config correction**

Only if `.env.example` changes:

```bash
git add .env.example
git commit -m "chore: align ayra advisor gemini model config"
```

## Self-Review Notes

- Spec coverage: The plan reviews `allocation-wall.html`, embeds an advisor into public pages, keeps the UI black, uses Gemini, answers AYRA/project/funding/paid/Stellar trace questions, includes citations, and preserves public privacy.
- Placeholder scan: No implementation step relies on unspecified handler names or future decisions. The only environment-dependent step is explicit live verification with `GEMINI_API_KEY`.
- Type consistency: `AdvisorSource`, `AdvisorAnswer`, citation shape, and route request shape are shared across tests, API, Gemini boundary, and UI.
- Dependency check: No new package dependency is introduced. Gemini is called via REST `fetch`; Zod already exists.
- Risk: The current docs use `gemini-3.5-flash`, while the mockup says `gemini-2.5-flash`. The plan defaults to current docs and keeps the model env-overridable.
