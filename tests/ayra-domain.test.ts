import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  approveApplication,
  createDemoState,
  createFundingBatch,
  getProofPack,
  getPublicWallProjection,
  moderateUpdate,
  mockSdpGateway,
  settleBatchFromSdp,
  submitApplication,
  submitBatchToSdp,
  submitUpdate,
  updateBatchLineItems,
  verifyPayoutAddress,
} from "../src/lib/ayra/domain";

describe("AYRA Stellar domain smoke path", () => {
  it("projects only approved, privacy-safe public records for Providencia", () => {
    const state = createDemoState();
    const wall = getPublicWallProjection(state, "providencia");

    assert.equal(wall.track.name, "Providencia");
    assert.equal(wall.initiatives[0]?.name, "Reforestation");
    assert.ok(wall.updates.length >= 2);
    assert.deepEqual(
      wall.updates.map((update) => update.status),
      wall.updates.map(() => "approved"),
    );
    assert.ok(
      wall.updates.every(
        (update, index, updates) =>
          index === 0 ||
          Date.parse(updates[index - 1].publishedAt) >=
            Date.parse(update.publishedAt),
      ),
    );
    assert.ok(wall.spending.every((item) => !item.recipientName));
    assert.ok(wall.spending.every((item) => item.category.length > 0));
    assert.ok(wall.batches.some((batch) => batch.publicLabel === "In flight"));
    assert.ok(wall.batches.some((batch) => batch.publicLabel === "Cleared"));
    assert.ok(!JSON.stringify(wall).includes("leidy@ecoparque.co"));
  });

  it("runs application approval, update moderation, verified payout, mock SDP, and proof visibility", async () => {
    let state = createDemoState();

    const applicationResult = submitApplication(state, {
      applicantEmail: "ana@example.org",
      applicantName: "Ana Howard",
      proposedTrackName: "Providencia",
      proposedInitiativeName: "Mangrove nursery",
      scopeSummary: "Native mangrove nursery for storm resilience.",
      operationalNotes: "Monthly updates, one grantee contact, USDC payout.",
      contactSignal: "+57 301 111 2222",
    });
    state = applicationResult.state;

    const approvalResult = approveApplication(state, {
      applicationId: applicationResult.application.id,
      actorProfileId: "profile-admin",
      assignRoles: ["steward", "grantee_contact"],
      initiativeCode: "AYRA-PVD-MANGROVE",
      granteeName: "Mangrove Cooperative",
      payoutAddress: "GBMANGROVEPROVIDENCIASTELLAR0000000000000000000001",
    });
    state = approvalResult.state;

    assert.equal(approvalResult.application.status, "approved");
    assert.ok(
      state.userRoles.some(
        (role) =>
          role.profileId === approvalResult.profile.id && role.role === "steward",
      ),
    );
    assert.ok(
      state.auditLogs.some(
        (entry) =>
          entry.action === "application.approved" &&
          entry.entityId === applicationResult.application.id,
      ),
    );

    assert.throws(
      () =>
        createFundingBatch(state, {
          actorProfileId: "profile-admin",
          initiativeId: approvalResult.initiative.id,
          code: "PV-MANGROVE-MAY26",
          periodLabel: "May 2026",
          lineItems: [
            {
              category: "Nursery materials",
              amountUsdc: 2400,
              localAmount: 9360000,
              localCurrency: "COP",
            },
          ],
        }),
      /verified payout address/,
    );

    state = verifyPayoutAddress(state, {
      actorProfileId: "profile-admin",
      payoutAddressId: approvalResult.payoutAddress.id,
      verificationNote: "Voice-confirmed with Ana Howard.",
    }).state;

    const updateResult = submitUpdate(state, {
      actorProfileId: approvalResult.profile.id,
      initiativeId: approvalResult.initiative.id,
      milestoneId: approvalResult.milestones[0].id,
      caption:
        "First trays are labeled and ready for the week-one germination count.",
      media: [
        {
          kind: "image",
          url: "/demo/mangrove-trays.jpg",
          alt: "Seedling trays in a small nursery.",
          publicReady: true,
        },
      ],
    });
    state = updateResult.state;

    assert.ok(
      !getPublicWallProjection(state, "providencia").updates.some(
        (update) => update.id === updateResult.update.id,
      ),
    );

    state = moderateUpdate(state, {
      actorProfileId: "profile-admin",
      updateId: updateResult.update.id,
      action: "edit-and-approve",
      publicCaption:
        "First mangrove trays are labeled and ready for the week-one germination count.",
    }).state;

    assert.ok(
      getPublicWallProjection(state, "providencia").updates.some(
        (update) => update.id === updateResult.update.id,
      ),
    );

    const batchResult = createFundingBatch(state, {
      actorProfileId: "profile-admin",
      initiativeId: approvalResult.initiative.id,
      code: "PV-MANGROVE-MAY26",
      periodLabel: "May 2026",
      sponsorId: "sponsor-audi",
      lineItems: [
        {
          category: "Nursery materials",
          amountUsdc: 2400,
          localAmount: 9360000,
          localCurrency: "COP",
        },
      ],
    });
    state = batchResult.state;

    state = submitBatchToSdp(state, {
      actorProfileId: "profile-admin",
      batchId: batchResult.batch.id,
      gateway: mockSdpGateway,
    }).state;
    assert.equal(
      state.batches.find((batch) => batch.id === batchResult.batch.id)?.status,
      "submitted",
    );

    state = await settleBatchFromSdp(state, {
      actorProfileId: "profile-admin",
      batchId: batchResult.batch.id,
      gateway: mockSdpGateway,
    });

    const proof = getProofPack(state, batchResult.batch.id);
    assert.equal(proof.publicLabel, "Cleared");
    assert.equal(proof.receipts[0]?.category, "Nursery materials");
    assert.match(proof.receipts[0]?.transactionHash ?? "", /^mock-tx-/);
  });

  it("keeps submitted batch line items immutable", () => {
    const state = createDemoState();
    const submittedBatch = state.batches.find(
      (batch) => batch.status === "submitted",
    );

    assert.ok(submittedBatch);
    assert.throws(
      () =>
        updateBatchLineItems(state, {
          actorProfileId: "profile-admin",
          batchId: submittedBatch.id,
          lineItems: [],
        }),
      /immutable/,
    );
  });
});
