import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAdvisorPrompt,
  buildAdvisorSourceRows,
  buildAdvisorSources,
  fallbackAdvisorAnswer,
  isApprovedProjectsQuestion,
  normalizeAdvisorAnswer,
} from "../src/lib/ayra/advisor";
import { POST as postAdvisor } from "../src/app/api/advisor/route";
import { createDemoState } from "../src/lib/ayra/domain";

async function withAdvisorFallbackEnv<T>(run: () => Promise<T>) {
  const keys = [
    "GEMINI_API_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  const previous = new Map(keys.map((key) => [key, process.env[key]]));

  for (const key of keys) {
    delete process.env[key];
  }

  try {
    return await run();
  } finally {
    for (const key of keys) {
      const value = previous.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

async function withMockedGemini<T>(
  responseBody: unknown,
  run: () => Promise<T>,
) {
  const previousApiKey = process.env.GEMINI_API_KEY;
  const previousFetch = globalThis.fetch;

  process.env.GEMINI_API_KEY = "test-gemini-key";
  globalThis.fetch = async () =>
    new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

  try {
    return await run();
  } finally {
    if (previousApiKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = previousApiKey;
    }
    globalThis.fetch = previousFetch;
  }
}

function advisorRequest(body: unknown) {
  return new Request("http://localhost/api/advisor", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("AYRA advisor public source contract", () => {
  it("classifies approval-list questions broadly", () => {
    assert.equal(isApprovedProjectsQuestion("What is the public approval list?"), true);
    assert.equal(isApprovedProjectsQuestion("Which initiatives are live?"), true);
    assert.equal(isApprovedProjectsQuestion("Which programs are funded?"), true);
    assert.equal(isApprovedProjectsQuestion("List active initiatives."), true);
    assert.equal(isApprovedProjectsQuestion("How much has been paid for Reforestation?"), false);
  });

  it("builds approved-project facts from public initiative statuses only", () => {
    const sources = buildAdvisorSources(createDemoState(), {});
    const approved = sources.find(
      (source) => source.id === "ayra:approved-projects",
    );

    assert.ok(approved);
    assert.match(approved.content, /public approval states are live and funding/i);
    assert.match(approved.content, /Reforestation \(live\)/i);
    assert.match(approved.content, /Draft initiatives are not public yet\./i);
  });

  it("prepares sync rows for the advisor source table", () => {
    const rows = buildAdvisorSourceRows(createDemoState());
    const approved = rows.find((row) => row.id === "ayra:approved-projects");

    assert.ok(approved);
    assert.match(approved.contentHash, /^[a-f0-9]{64}$/);
    assert.ok(Array.isArray(approved.embedding));
    assert.ok(approved.embedding.length > 0);
  });

  it("builds funding facts from public projections only", () => {
    const sources = buildAdvisorSources(createDemoState(), {
      trackSlug: "providencia",
      initiativeSlug: "reforestation",
    });
    const funding = sources.find(
      (source) => source.id === "funding:providencia:reforestation",
    );

    assert.ok(funding);
    assert.match(funding.content, /visible batch volume:/i);
    assert.match(funding.content, /settled total:/i);
    assert.match(funding.content, /in flight total:/i);
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

  it("builds public AYRA north-star facts from the website knowledge source", () => {
    const sources = buildAdvisorSources(createDemoState(), {});
    const northStar = sources.find((source) => source.id === "ayra:north-star");
    const studioModel = sources.find((source) => source.id === "ayra:studio-model");
    const season = sources.find((source) => source.id === "ayra:season-timeline");
    const verticals = sources.find((source) => source.id === "ayra:verticals");

    assert.ok(northStar);
    assert.match(northStar.content, /impact zones/i);
    assert.match(northStar.content, /Providencia/i);
    assert.ok(studioModel);
    assert.match(studioModel.content, /one company, one vertical, three teams/i);
    assert.ok(season);
    assert.match(season.content, /September 2026/i);
    assert.ok(verticals);
    assert.match(verticals.content, /Regenerative Life/i);
    assert.match(verticals.content, /Compute and Agents/i);
  });

  it("falls back conversationally for general AYRA questions", () => {
    const sources = buildAdvisorSources(createDemoState(), {});
    const response = fallbackAdvisorAnswer("What is AYRA?", sources);

    assert.equal(response.status, "answered");
    assert.match(response.answer, /AYRA is/i);
    assert.match(response.answer, /Providencia/i);
    assert.doesNotMatch(response.answer, /once public sources support/i);
    assert.equal(response.citations[0]?.sourceId, "ayra:north-star");
  });

  it("falls back conversationally for Studio and sponsor questions", () => {
    const sources = buildAdvisorSources(createDemoState(), {});
    const response = fallbackAdvisorAnswer("How does a Studio sponsorship work?", sources);

    assert.equal(response.status, "answered");
    assert.match(response.answer, /Studio/i);
    assert.match(response.answer, /37,500/i);
    assert.match(response.answer, /three teams/i);
    assert.equal(response.citations[0]?.sourceId, "ayra:studio-model");
  });

  it("falls back deterministically for approved-project questions", () => {
    const sources = buildAdvisorSources(createDemoState(), {});
    const response = fallbackAdvisorAnswer(
      "Which projects are currently approved?",
      sources,
    );

    assert.equal(response.status, "answered");
    assert.match(response.answer, /public approval states are live and funding/i);
    assert.match(response.answer, /Reforestation/i);
    assert.equal(response.citations[0]?.sourceId, "ayra:approved-projects");
  });

  it("does not include private records in any source text", () => {
    const serialized = JSON.stringify(buildAdvisorSources(createDemoState(), {}));

    assert.doesNotMatch(serialized, /leidy@ecoparque\.co/i);
    assert.doesNotMatch(serialized, /receipts\/batch-reforest-apr26\/crew\.pdf/i);
    assert.doesNotMatch(serialized, /GBLEIDYECOPARQUE/i);
    assert.doesNotMatch(serialized, /\+57 300 000 0000/i);
    assert.doesNotMatch(serialized, /profile-admin/i);
  });

  it("does not crash on public text that names payout setup without exposing an address", () => {
    const state = createDemoState();
    state.initiatives.push({
      id: "initiative-public-payout-setup",
      trackId: "track-providencia",
      code: "AYRA-PVD-PAYOUT-SETUP",
      slug: "payout-setup",
      name: "Payout Setup",
      headline: "Public setup language from a live application.",
      description:
        "Monthly updates, one steward contact, no immediate payout address, and admin approval before funding.",
      stewardName: "Public Steward",
      leagueScore: 50,
      targetMetricLabel: "Milestone progress",
      targetMetricCurrent: 0,
      targetMetricGoal: 100,
      status: "funding",
    });

    assert.doesNotThrow(() =>
      buildAdvisorSources(state, {
        trackSlug: "providencia",
        initiativeSlug: "payout-setup",
      }),
    );
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
    assert.match(response.answer, /Visible batch volume: 4,820 USDC/);
    assert.match(response.answer, /Crew wages: 4,820 USDC/);
    assert.doesNotMatch(response.answer, /mock-payment-/);
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
    const prompt = buildAdvisorPrompt(
      "What is the public approval list?",
      sources,
      [
        { role: "user", text: "Tell me the public approval list." },
        { role: "advisor", text: "AYRA public approval states are live and funding." },
      ],
    );

    assert.match(prompt, /SOURCE ID: ayra:approved-projects/);
    assert.match(prompt, /SOURCE ID: ayra:north-star/);
    assert.match(prompt, /SOURCE ID: funding:providencia:reforestation/);
    assert.match(prompt, /SOURCE ID: stellar:providencia:reforestation/);
    assert.match(prompt, /Do not reveal private contacts/i);
    assert.match(prompt, /founder-operator voice/i);
    assert.match(prompt, /visionary and movement-building/i);
    assert.match(prompt, /warm, charismatic, and community-first/i);
    assert.match(prompt, /principled and lightly ideological/i);
    assert.match(prompt, /Do not use crypto hype/i);
    assert.match(prompt, /approved-projects source/i);
    assert.match(prompt, /live and funding are the public approval statuses/i);
    assert.match(prompt, /Conversation history:/i);
    assert.match(prompt, /Question: What is the public approval list\?/);
    assert.ok(prompt.length < 15000);
  });
});

describe("AYRA advisor API route", () => {
  it("returns deterministic fallback funding answers without GEMINI_API_KEY", async () => {
    await withAdvisorFallbackEnv(async () => {
      const response = await postAdvisor(
        advisorRequest({
          question: "How much has been paid for Reforestation?",
          route: {
            trackSlug: "providencia",
            initiativeSlug: "reforestation",
          },
        }),
      );
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.mode, "deterministic-fallback");
      assert.match(body.answer, /USDC/);
      assert.equal(
        body.citations[0]?.sourceId,
        "funding:providencia:reforestation",
      );
    });
  });

  it("returns deterministic fallback Stellar hash answers without GEMINI_API_KEY", async () => {
    await withAdvisorFallbackEnv(async () => {
      const response = await postAdvisor(
        advisorRequest({
          question: "Where can I watch the transaction hash on Stellar?",
          route: {
            trackSlug: "providencia",
            initiativeSlug: "reforestation",
          },
        }),
      );
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.mode, "deterministic-fallback");
      assert.match(body.answer, /transaction hash/i);
      assert.match(body.answer, /Stellar/i);
      assert.equal(
        body.citations[0]?.sourceId,
        "stellar:providencia:reforestation",
      );
    });
  });

  it("returns deterministic fallback approved-project answers without GEMINI_API_KEY", async () => {
    await withAdvisorFallbackEnv(async () => {
      const response = await postAdvisor(
        advisorRequest({
          question: "List active initiatives.",
          route: {
            trackSlug: "providencia",
            initiativeSlug: "reforestation",
          },
        }),
      );
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.mode, "deterministic-fallback");
      assert.match(body.answer, /public approval states are live and funding/i);
      assert.match(body.answer, /Reforestation/i);
      assert.equal(body.citations[0]?.sourceId, "ayra:approved-projects");
    });
  });

  it("returns deterministic fallback AYRA overview answers without GEMINI_API_KEY", async () => {
    await withAdvisorFallbackEnv(async () => {
      const response = await postAdvisor(
        advisorRequest({
          question: "What is AYRA?",
          route: {
            trackSlug: "providencia",
            initiativeSlug: "reforestation",
          },
        }),
      );
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.mode, "deterministic-fallback");
      assert.match(body.answer, /AYRA is/i);
      assert.match(body.answer, /Providencia/i);
      assert.equal(body.citations[0]?.sourceId, "ayra:north-star");
    });
  });

  it("uses the grounded fallback when Gemini declines a supported AYRA overview", async () => {
    await withMockedGemini(
      {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    answer:
                      "The sources do not contain a definition of AYRA.",
                    citations: [],
                    followups: [],
                    status: "grounded_decline",
                  }),
                },
              ],
            },
          },
        ],
      },
      async () => {
        const response = await postAdvisor(
          advisorRequest({
            question: "What is AYRA?",
            route: {
              trackSlug: "providencia",
              initiativeSlug: "reforestation",
            },
          }),
        );
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.mode, "deterministic-fallback");
        assert.equal(body.status, "answered");
        assert.match(body.answer, /AYRA is/i);
        assert.equal(body.citations[0]?.sourceId, "ayra:north-star");
      },
    );
  });

  it("returns 400 for malformed advisor questions", async () => {
    await withAdvisorFallbackEnv(async () => {
      const response = await postAdvisor(
        advisorRequest({
          question: "no",
          route: {
            trackSlug: "providencia",
            initiativeSlug: "reforestation",
          },
        }),
      );
      const body = await response.json();

      assert.equal(response.status, 400);
      assert.equal(body.error.code, "advisor_invalid_request");
    });
  });
});
