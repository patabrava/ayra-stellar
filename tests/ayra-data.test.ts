import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
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
      initiative_name: "Reforestation",
      sponsor_name: "Climate Future",
      category: "Crew wages",
      amount_usdc: 4820,
      local_amount: 18798000,
      local_currency: "COP",
      line_item_status: "submitted",
      sdp_payment_id: "mock-payment-1",
      transaction_hash: null,
    },
  ],
};

describe("AYRA Supabase row mapping", () => {
  it("maps public rows into a privacy-safe wall and proof state", () => {
    const state = stateFromPublicRows(publicRows);
    const wall = getPublicWallProjection(state, "providencia");
    const proof = getProofPack(state, "batch-1");

    assert.equal(wall.track.name, "Providencia");
    assert.deepEqual(
      wall.updates.map((update) => update.caption),
      ["Public planting update."],
    );
    assert.equal(wall.spending[0]?.category, "Crew wages");
    assert.equal(wall.batches[0]?.publicLabel, "In flight");
    assert.equal(proof.receipts[0]?.id, "line-1");
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
      fundingAllocations: [],
      reconciliationItems: [],
      sdpSyncEvents: [],
      auditLogs: [],
    });

    assert.equal(state.profiles[0]?.displayName, "Leidy Mendoza");
    assert.equal(state.userRoles[0]?.role, "grantee_contact");
    assert.equal(state.granteeContacts[0]?.granteeId, "grantee-1");
  });
});
