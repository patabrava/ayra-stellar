import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAdvisorPrompt,
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
    assert.match(
      approved.content,
      /Providencia: Reforestation \(live\), Dog Sterilization \(funding\), Reef \(funding\)/i,
    );
    assert.match(
      approved.content,
      /Futuromundo: Forest Corridor Demo \(live\)/i,
    );
    assert.match(approved.content, /Draft initiatives are not public yet\./i);
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

  it("falls back deterministically for approved-project questions", () => {
    const sources = buildAdvisorSources(createDemoState(), {});
    const response = fallbackAdvisorAnswer(
      "Which projects are currently approved?",
      sources,
    );

    assert.equal(response.status, "answered");
    assert.match(response.answer, /public approval states are live and funding/i);
    assert.match(response.answer, /Reforestation/i);
    assert.match(response.answer, /Dog Sterilization/i);
    assert.match(response.answer, /Forest Corridor Demo/i);
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
    const prompt = buildAdvisorPrompt("Which projects are currently approved?", sources);

    assert.match(prompt, /SOURCE ID: ayra:approved-projects/);
    assert.match(prompt, /SOURCE ID: funding:providencia:reforestation/);
    assert.match(prompt, /SOURCE ID: stellar:providencia:reforestation/);
    assert.match(prompt, /Do not reveal private contacts/i);
    assert.match(prompt, /approved-projects source/i);
    assert.match(prompt, /live and funding are the public approval statuses/i);
    assert.match(prompt, /Explain transaction hashes/i);
    assert.match(prompt, /Question: Which projects are currently approved\?/);
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
      assert.match(body.answer, /30,000 USDC/);
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
      assert.match(body.answer, /Forest Corridor Demo/i);
      assert.equal(body.citations[0]?.sourceId, "ayra:approved-projects");
    });
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
