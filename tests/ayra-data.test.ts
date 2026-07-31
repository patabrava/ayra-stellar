import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  loadOperatorAyraState,
  loadPublicAyraState,
  stateFromOperatorRows,
  stateFromPublicRows,
} from "../src/lib/ayra/data";
import { getProofPack, getPublicWallProjection } from "../src/lib/ayra/domain";

const publicRows = {
  tracks: [
    {
      id: "track-1",
      slug: "providencia",
      name: "pROVIDENCIA",
      local_currency: "COP",
      theme: "Cinematic island stewardship",
    },
  ],
  sponsors: [
    {
      id: "sponsor-1",
      slug: "climate-future",
      name: "Climate Future",
      public_attribution: "Climate Future matched this month.",
    },
  ],
  initiatives: [
    {
      id: "initiative-1",
      track_id: "track-1",
      sponsor_id: "sponsor-1",
      code: "AYRA-PVD-REFOREST",
      slug: "reforestation",
      name: "Reforestation",
      headline: "Native canopy across Old Point and Bottom House.",
      description: "Category-level receipts without private recipient data.",
      steward_name: "Leidy Mendoza",
      league_score: 87,
      target_metric_label: "Trees in the ground",
      target_metric_current: 1284,
      target_metric_goal: 1800,
      status: "live",
    },
  ],
  milestones: [
    {
      id: "milestone-1",
      initiative_id: "initiative-1",
      code: "M03",
      title: "Planting in flight",
      percent_complete: 71,
      status: "active",
    },
  ],
  updates: [
    {
      id: "update-1",
      initiative_id: "initiative-1",
      milestone_id: "milestone-1",
      submitted_by_profile_id: "profile-private",
      source: "grantee_contact",
      caption: "Private draft wording",
      public_caption: "Public planting update.",
      status: "approved",
      internal_initials: null,
      submitted_at: "2026-04-22T10:06:00Z",
      published_at: "2026-04-22T15:00:00Z",
      moderated_by_profile_id: "profile-admin",
      sanitized_feedback: null,
    },
  ],
  media: [
    {
      update_id: "update-1",
      kind: "image",
      url: "/window.svg",
      alt: "Field team checking young native trees.",
      public_ready: true,
    },
  ],
  batches: [
    {
      id: "batch-1",
      initiative_id: "initiative-1",
      sponsor_id: "sponsor-1",
      code: "PV-REFOREST-APR26",
      period_label: "April 2026",
      stellar_network: "pubnet",
      payment_kind: "normal",
      milestone_submission_id: "milestone-submission-1",
      status: "submitted",
      created_by_profile_id: "profile-admin",
      created_at: "2026-04-29T10:00:00Z",
      submitted_at: "2026-04-30T09:14:00Z",
      settled_at: null,
      sdp_batch_id: "mock-batch-1",
    },
  ],
  receipts: [
    {
      line_item_id: "line-1",
      batch_id: "batch-1",
      batch_code: "PV-REFOREST-APR26",
      period_label: "April 2026",
      batch_status: "submitted",
      stellar_network: "pubnet",
      initiative_name: "Reforestation",
      sponsor_name: "Climate Future",
      category: "Crew wages",
      amount_usdc: 4820,
      local_amount: 18798000,
      local_currency: "COP",
      line_item_status: "submitted",
      transaction_hash: null,
      payment_asset_code: null,
      payment_asset_issuer: null,
      payment_asset_amount: null,
    },
    {
      line_item_id: "line-2",
      batch_id: "batch-1",
      batch_code: "PV-REFOREST-APR26",
      period_label: "April 2026",
      batch_status: "submitted",
      stellar_network: "pubnet",
      initiative_name: "Reforestation",
      sponsor_name: "Climate Future",
      category: "Seedlings",
      amount_usdc: 1,
      local_amount: 3900,
      local_currency: "COP",
      line_item_status: "settled",
      transaction_hash:
        "9b02f2db43af6a56907b92c1e74d95db1b243524b57430a5d1a579285d6c6ac6",
      payment_asset_code: "USDC",
      payment_asset_issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      payment_asset_amount: 1,
    },
    {
      line_item_id: "line-xlm",
      batch_id: "batch-1",
      batch_code: "PV-REFOREST-APR26",
      period_label: "April 2026",
      batch_status: "submitted",
      stellar_network: "pubnet",
      initiative_name: "Reforestation",
      sponsor_name: "Climate Future",
      category: "Crew wages",
      amount_usdc: 1,
      local_amount: 3900,
      local_currency: "COP",
      line_item_status: "settled",
      transaction_hash:
        "4ee20870c7d17a13234d36a1c8d9f285a68defa3a8ec4172de1ad58f7acc8783",
      payment_asset_code: null,
      payment_asset_issuer: null,
      payment_asset_amount: null,
    },
  ],
};

describe("AYRA Supabase row mapping", () => {
  it("fails closed instead of serving demo proof data when public Supabase env is missing in production", async () => {
    const previous = {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      vercelEnv: process.env.VERCEL_ENV,
    };

    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.VERCEL_ENV = "production";

    try {
      await assert.rejects(
        () => loadPublicAyraState(),
        /Public Supabase environment is not configured/,
      );
    } finally {
      restoreEnv("NEXT_PUBLIC_SUPABASE_URL", previous.url);
      restoreEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", previous.anonKey);
      restoreEnv("VERCEL_ENV", previous.vercelEnv);
    }
  });

  it("does not serve demo operator state unless demo mode is explicit", async () => {
    const previous = {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      demoMode: process.env.AYRA_DEMO_MODE,
    };

    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.AYRA_DEMO_MODE;

    try {
      await assert.rejects(
        () => loadOperatorAyraState(),
        /Operator Supabase environment is not configured/,
      );

      process.env.AYRA_DEMO_MODE = "1";
      const state = await loadOperatorAyraState();
      assert.ok(state.profiles.some((profile) => profile.id === "profile-admin"));
    } finally {
      restoreEnv("NEXT_PUBLIC_SUPABASE_URL", previous.url);
      restoreEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", previous.anonKey);
      restoreEnv("SUPABASE_SERVICE_ROLE_KEY", previous.serviceRoleKey);
      restoreEnv("AYRA_DEMO_MODE", previous.demoMode);
    }
  });

  it("maps public rows into a privacy-safe wall and proof state", () => {
    const state = stateFromPublicRows(publicRows);
    const wall = getPublicWallProjection(state, "providencia");
    const proof = getProofPack(state, "batch-1");

    assert.equal(wall.track.name, "Providencia");
    assert.deepEqual(
      wall.updates.map((update) => update.caption),
      ["Public planting update."],
    );
    assert.equal(wall.spending[0]?.category, "Seedlings");
    assert.equal(wall.spending[0]?.amountUsdc, 1);
    assert.equal(wall.batches[0]?.amountUsdc, 1);
    assert.equal(wall.batches[0]?.publicLabel, "In flight");
    assert.equal(state.batches[0]?.stellarNetwork, "pubnet");
    assert.equal(proof.stellarNetwork, "pubnet");
    assert.equal(proof.receipts.length, 1);
    assert.equal(proof.receipts[0]?.id, "line-2");
    assert.equal(
      proof.receipts[0]?.transactionHash,
      "9b02f2db43af6a56907b92c1e74d95db1b243524b57430a5d1a579285d6c6ac6",
    );
    assert.equal(proof.receipts[0]?.assetCode, "USDC");
    assert.equal(
      proof.receipts[0]?.assetIssuer,
      "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    );
    assert.ok(!JSON.stringify(wall).includes("mock-payment-1"));
    assert.ok(!JSON.stringify(wall).includes("payment-xlm-1"));
    assert.ok(!JSON.stringify(wall).includes("profile-private"));
  });

  it("normalizes canonical track display names from live rows", () => {
    const state = stateFromPublicRows({
      ...publicRows,
      tracks: [
        {
          ...publicRows.tracks[0],
          name: "pROVIDENCIA",
        },
        {
          id: "track-2",
          slug: "amazonas",
          name: "fUTUROMUNDO",
          local_currency: "USD",
          theme: "Forest corridor",
        },
      ],
    });

    assert.equal(state.tracks[0]?.name, "Providencia");
    assert.equal(state.tracks[1]?.name, "Futuromundo");
  });

  it("maps operator-only scoped records, including grantee contacts", () => {
    const state = stateFromOperatorRows({
      ...publicRows,
      profiles: [
        {
          id: "profile-leidy",
          email: "leidy@ecoparque.co",
          display_name: "Leidy Mendoza",
          created_at: "2026-01-08T11:00:00Z",
        },
      ],
      userRoles: [
        {
          id: "role-contact",
          profile_id: "profile-leidy",
          role: "grantee_contact",
          initiative_id: null,
          grantee_id: "grantee-1",
        },
      ],
      applications: [],
      stewardProfiles: [],
      grantees: [
        {
          id: "grantee-1",
          initiative_id: "initiative-1",
          name: "Ecoparque Iron Wood",
          contact_profile_id: "profile-leidy",
        },
      ],
      granteeContacts: [
        {
          id: "contact-1",
          profile_id: "profile-leidy",
          grantee_id: "grantee-1",
        },
      ],
      payoutAddresses: [],
      milestoneSubmissions: [
        {
          id: "milestone-submission-1",
          initiative_id: "initiative-1",
          milestone_id: "milestone-1",
          submitted_by_profile_id: "profile-leidy",
          status: "approved",
          title: "April planting evidence",
          summary: "Private receipt and crew-log package.",
          private_document_path: "milestone-submissions/1/evidence.pdf",
          submitted_at: "2026-04-27T10:06:00Z",
          reviewed_at: "2026-04-28T10:06:00Z",
          reviewed_by_profile_id: "profile-admin",
          review_note: "Approved for April normal payment.",
        },
      ],
      fundingAllocations: [],
      reconciliationItems: [],
      sdpSyncEvents: [],
      auditLogs: [],
    });

    assert.equal(state.profiles[0]?.displayName, "Leidy Mendoza");
    assert.equal(state.userRoles[0]?.role, "grantee_contact");
    assert.equal(state.granteeContacts[0]?.granteeId, "grantee-1");
    assert.equal(state.milestoneSubmissions[0]?.status, "approved");
    assert.equal(
      state.milestoneSubmissions[0]?.privateDocumentPath,
      "milestone-submissions/1/evidence.pdf",
    );
    assert.equal(state.batches[0]?.paymentKind, "normal");
    assert.equal(
      state.batches[0]?.milestoneSubmissionId,
      "milestone-submission-1",
    );
    assert.ok(!JSON.stringify(stateFromPublicRows(publicRows)).includes("evidence.pdf"));
  });

  it("keeps the operator Supabase loader row order aligned with the destructured result order", () => {
    const source = readFileSync("src/lib/ayra/data.ts", "utf8");

    const alignedOrder =
      /payoutAddresses,\s+milestones,\s+updates,\s+media,\s+batches,\s+milestoneSubmissions,\s+lineItems,/g;

    assert.equal(source.match(alignedOrder)?.length, 2);
  });

  it("drops operator line items whose parent batch is no longer present", () => {
    const state = stateFromOperatorRows({
      ...publicRows,
      profiles: [],
      userRoles: [],
      applications: [],
      stewardProfiles: [],
      grantees: [],
      granteeContacts: [],
      payoutAddresses: [],
      lineItems: [
        {
          id: "line-valid",
          batch_id: "batch-1",
          category: "Verified payout",
          amount_usdc: 1,
          local_amount: 3900,
          local_currency: "COP",
          status: "settled",
          sdp_payment_id: null,
          transaction_hash:
            "9b02f2db43af6a56907b92c1e74d95db1b243524b57430a5d1a579285d6c6ac6",
          payment_asset_code: "USDC",
          payment_asset_issuer:
            "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
          payment_asset_amount: 1,
          private_recipient_name: null,
        },
        {
          id: "line-orphan-seed",
          batch_id: "deleted-seed-batch",
          category: "Seed fixture",
          amount_usdc: 9999,
          local_amount: 38996100,
          local_currency: "COP",
          status: "submitted",
          sdp_payment_id: null,
          transaction_hash: null,
          payment_asset_code: null,
          payment_asset_issuer: null,
          payment_asset_amount: null,
          private_recipient_name: null,
        },
      ],
      fundingAllocations: [],
      reconciliationItems: [],
      sdpSyncEvents: [],
      auditLogs: [],
    });

    assert.deepEqual(
      state.batchLineItems.map((item) => item.id),
      ["line-valid"],
    );
  });
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}
