import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { insertPublicApplication } from "../src/lib/ayra/public-write";

describe("AYRA public Supabase writes", () => {
  it("uses anonymous REST insert with return-minimal for application intake", async () => {
    let request: { url: string; init: RequestInit } | null = null;
    const response = await insertPublicApplication(
      {
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      },
      {
        applicantName: "Codex UI Steward",
        applicantEmail: "codex-ui@example.org",
        proposedTrackName: "Providencia",
        proposedInitiativeName: "UI nursery",
        scopeSummary: "Browser-managed public intake.",
        operationalNotes: "Operator review and payout setup.",
        contactSignal: "+57 300 555 0199",
      },
      async (url, init) => {
        request = { url: String(url), init: init ?? {} };
        return new Response(null, { status: 201 });
      },
    );

    assert.equal(response.ok, true);
    assert.equal(request?.url, "https://example.supabase.co/rest/v1/applications");
    assert.equal(request?.init.method, "POST");
    assert.equal(
      (request?.init.headers as Record<string, string>).Prefer,
      "return=minimal",
    );
    assert.deepEqual(JSON.parse(String(request?.init.body)), {
      applicant_name: "Codex UI Steward",
      applicant_email: "codex-ui@example.org",
      proposed_track_name: "Providencia",
      proposed_initiative_name: "UI nursery",
      scope_summary: "Browser-managed public intake.",
      operational_notes: "Operator review and payout setup.",
      contact_signal: "+57 300 555 0199",
      status: "pending",
    });
  });
});
