import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAdminViewModel,
  getAdminProofOptions,
} from "../src/app/admin/admin-view-model";
import {
  approveApplication,
  createDemoState,
  createFundingBatch,
  getCurrentProofBatch,
  getPublicInitiativeProjection,
  getProofPack,
  getPublicWallProjection,
  moderateUpdate,
  mockSdpGateway,
  approvedUnusedMilestoneSubmissions,
  rejectApplication,
  reviewMilestoneSubmission,
  settleBatchFromSdp,
  submitMilestoneSubmission,
  submitPayoutAddress,
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
    assert.equal(wall.spending.length, 1);
    assert.equal(wall.batches.length, 1);
    assert.ok(!JSON.stringify(wall).includes("leidy@ecoparque.co"));
  });

  it("scopes public projection by selected track and falls back on unknown slugs", () => {
    const state = createDemoState();
    const selected = getPublicWallProjection(state, "amazonas");
    const fallback = getPublicWallProjection(state, "unknown-track");

    assert.equal(selected.track.slug, "amazonas");
    assert.equal(selected.track.name, "Futuromundo");
    assert.ok(selected.initiatives.length > 0);
    assert.ok(
      selected.initiatives.every(
        (initiative) => initiative.trackId === selected.track.id,
      ),
    );
    assert.ok(
      selected.updates.every((update) =>
        selected.initiatives.some(
          (initiative) => initiative.name === update.initiativeName,
        ),
      ),
    );
    assert.ok(
      selected.batches.every((batch) =>
        selected.initiatives.some(
          (initiative) => initiative.name === batch.initiativeName,
        ),
      ),
    );
    assert.equal(fallback.track.slug, "providencia");
    assert.equal(fallback.activeInitiative.slug, "reforestation");
  });

  it("builds project pages from one initiative while keeping proof privacy-safe", () => {
    const state = createDemoState();
    const project = getPublicInitiativeProjection(
      state,
      "providencia",
      "reforestation",
    );

    assert.equal(project.track.slug, "providencia");
    assert.equal(project.initiative.slug, "reforestation");
    assert.ok(project.updates.length > 0);
    assert.equal(project.batches.length, 1);
    assert.ok(
      project.updates.every((update) => update.initiativeName === "Reforestation"),
    );
    assert.ok(
      project.batches.every((batch) => batch.initiativeName === "Reforestation"),
    );
    assert.ok(project.spending.every((item) => !item.recipientName));
    assert.ok(!JSON.stringify(project).includes("leidy@ecoparque.co"));
  });

  it("does not expose mock SDP references as public on-chain proof", () => {
    const state = createDemoState();
    const project = getPublicInitiativeProjection(
      state,
      "providencia",
      "reforestation",
    );
    const serializedProject = JSON.stringify(project);

    assert.equal(project.spending.length, 1);
    assert.equal(project.batches.length, 1);
    assert.ok(!serializedProject.includes("mock-tx-"));
    assert.ok(!serializedProject.includes("mock-payment-"));

    const seededBatch = state.batches.find(
      (batch) => batch.id === "batch-reforest-mar26",
    );
    assert.ok(seededBatch);
    const proof = getProofPack(state, seededBatch.id);

    assert.equal(proof.receipts.length, 0);
    assert.ok(!JSON.stringify(proof).includes("mock-tx-"));
    assert.ok(!JSON.stringify(proof).includes("mock-payment-"));
  });

  it("lets an admin reject a pending application without promoting access", () => {
    let state = createDemoState();
    const submitted = submitApplication(state, {
      applicantEmail: "reject-me@example.org",
      applicantName: "Reject Me",
      proposedTrackName: "Providencia",
      proposedInitiativeName: "Rejected pilot",
      scopeSummary: "A proposal that should not enter the public registry.",
      operationalNotes: "No portal access should be granted.",
      contactSignal: "+57 300 000 0000",
    });
    state = submitted.state;

    const result = rejectApplication(state, {
      applicationId: submitted.application.id,
      actorProfileId: "profile-admin",
    });

    assert.equal(result.application.status, "rejected");
    assert.equal(result.application.decidedByProfileId, "profile-admin");
    assert.ok(result.application.decidedAt);
    assert.ok(
      result.state.auditLogs.some(
        (entry) =>
          entry.action === "application.rejected" &&
          entry.entityId === submitted.application.id,
      ),
    );
    assert.ok(
      !result.state.initiatives.some(
        (initiative) => initiative.name === "Rejected pilot",
      ),
    );
    assert.ok(
      !result.state.userRoles.some(
        (role) =>
          role.profileId === submitted.application.applicantProfileId &&
          (role.role === "steward" || role.role === "grantee_contact"),
      ),
    );
  });

  it("uses real Stellar transaction hashes for public proof volume", () => {
    const realHash =
      "9b02f2db43af6a56907b92c1e74d95db1b243524b57430a5d1a579285d6c6ac6";
    const state = createDemoState();
    const batchId = "batch-reforest-apr26";
    const batchLineItems = state.batchLineItems.map((lineItem) =>
      lineItem.id === `${batchId}-line-1`
        ? {
            ...lineItem,
            amountUsdc: 1,
            localAmount: 3900,
            status: "settled" as const,
            sdpPaymentId: "real-payment-1",
            transactionHash: realHash,
            paymentAssetCode: "USDC" as const,
            paymentAssetIssuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
            paymentAssetAmount: 1,
          }
        : lineItem,
    );
    const project = getPublicInitiativeProjection(
      { ...state, batchLineItems },
      "providencia",
      "reforestation",
    );
    const proof = getProofPack({ ...state, batchLineItems }, batchId);

    assert.equal(project.spending.length, 1);
    assert.equal(project.spending[0]?.amountUsdc, 1);
    assert.equal(project.batches[0]?.amountUsdc, 1);
    assert.equal(proof.receipts.length, 1);
    assert.equal(proof.receipts[0]?.transactionHash, realHash);
  });

  it("does not publish hash-only receipts without verified USDC metadata", () => {
    const state = createDemoState();
    const batchId = "batch-reforest-apr26";
    const batchLineItems = state.batchLineItems.map((lineItem) =>
      lineItem.id === `${batchId}-line-1`
        ? {
            ...lineItem,
            amountUsdc: 1,
            localAmount: 3900,
            status: "settled" as const,
            sdpPaymentId: "payment-xlm-1",
            transactionHash:
              "4ee20870c7d17a13234d36a1c8d9f285a68defa3a8ec4172de1ad58f7acc8783",
          }
        : lineItem,
    );

    const project = getPublicInitiativeProjection(
      { ...state, batchLineItems },
      "providencia",
      "reforestation",
    );
    const proof = getProofPack({ ...state, batchLineItems }, batchId);

    assert.equal(project.spending.length, 0);
    assert.equal(proof.receipts.length, 0);
  });

  it("does not select a current proof batch before payouts are submitted", () => {
    const state = createDemoState();
    const emptyScope = state.batches.filter(
      (batch) => batch.initiativeId === "initiative-without-batches",
    );
    const draftBatch = state.batches.find((batch) => batch.status === "draft");
    const settledBatch = state.batches.find((batch) => batch.status === "settled");
    const submittedBatch = state.batches.find((batch) => batch.status === "submitted");

    assert.equal(getCurrentProofBatch(emptyScope), null);
    assert.equal(draftBatch ? getCurrentProofBatch([draftBatch]) : null, null);
    assert.equal(getCurrentProofBatch([settledBatch!, submittedBatch!])?.id, submittedBatch?.id);
  });

  it("lets admin proof packs select among verified batches without exposing drafts", async () => {
    process.env.AYRA_USD_COP_RATE = "3900";
    const state = createDemoState();
    const verifiedHash =
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const draftHash =
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    const newerVerifiedBatch = {
      ...state.batches[0],
      id: "batch-reforest-may26",
      code: "PV-REFOREST-MAY26",
      periodLabel: "May 2026",
      status: "settled" as const,
      createdAt: "2026-05-29T10:00:00.000Z",
      submittedAt: "2026-05-30T09:14:00.000Z",
      settledAt: "2026-05-30T12:00:00.000Z",
    };
    const readyBatch = {
      ...state.batches[0],
      id: "batch-reforest-ready",
      code: "PV-REFOREST-READY",
      status: "ready" as const,
      createdAt: "2026-06-01T10:00:00.000Z",
    };
    const nextState = {
      ...state,
      batches: [readyBatch, newerVerifiedBatch, ...state.batches],
      batchLineItems: [
        {
          ...state.batchLineItems[0],
          id: "batch-reforest-may26-line-1",
          batchId: newerVerifiedBatch.id,
          category: "Canopy crew",
          amountUsdc: 2,
          localAmount: 7800,
          status: "settled" as const,
          transactionHash: verifiedHash,
          paymentAssetCode: "USDC" as const,
          paymentAssetIssuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
          paymentAssetAmount: 2,
        },
        {
          ...state.batchLineItems[0],
          id: "batch-reforest-ready-line-1",
          batchId: readyBatch.id,
          status: "settled" as const,
          transactionHash: draftHash,
          paymentAssetCode: "USDC" as const,
          paymentAssetIssuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
          paymentAssetAmount: state.batchLineItems[0]!.amountUsdc,
        },
        ...state.batchLineItems,
      ],
    };

    const options = getAdminProofOptions(nextState);
    const defaultView = await buildAdminViewModel(nextState);
    const selectedView = await buildAdminViewModel(nextState, "batch-reforest-apr26");
    const fallbackView = await buildAdminViewModel(nextState, readyBatch.id);

    assert.deepEqual(
      options.map((option) => option.batchId),
      ["batch-reforest-may26", "batch-reforest-apr26"],
    );
    assert.equal(defaultView.proof?.batchId, "batch-reforest-may26");
    assert.equal(selectedView.proof?.batchId, "batch-reforest-apr26");
    assert.equal(selectedView.proof?.publicLabel, "In flight");
    assert.equal(fallbackView.proof?.batchId, "batch-reforest-may26");
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

    const milestoneSubmission = submitMilestoneSubmission(state, {
      actorProfileId: approvalResult.profile.id,
      initiativeId: approvalResult.initiative.id,
      milestoneId: approvalResult.milestones[0].id,
      title: "Week-one nursery evidence",
      summary: "Private receipts and tray count for the first nursery payment.",
    });
    state = milestoneSubmission.state;
    state = reviewMilestoneSubmission(state, {
      actorProfileId: "profile-admin",
      submissionId: milestoneSubmission.submission.id,
      status: "approved",
    }).state;

    const batchResult = createFundingBatch(state, {
      actorProfileId: "profile-admin",
      initiativeId: approvalResult.initiative.id,
      code: "PV-MANGROVE-MAY26",
      periodLabel: "May 2026",
      sponsorId: "sponsor-audi",
      paymentKind: "normal",
      milestoneSubmissionId: milestoneSubmission.submission.id,
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
    assert.equal(proof.trackSlug, "providencia");
    assert.equal(proof.initiativeSlug, "mangrove-nursery");
    assert.equal(proof.receipts.length, 0);
    assert.ok(!JSON.stringify(proof).includes("mock-tx-"));
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

  it("lets a scoped steward submit the first payout address after approval", () => {
    let state = createDemoState();
    state = {
      ...state,
      payoutAddresses: state.payoutAddresses.filter(
        (item) => item.initiativeId !== "initiative-reforest",
      ),
    };

    const submitted = submitPayoutAddress(state, {
      actorProfileId: "profile-leidy",
      initiativeId: "initiative-reforest",
      address: "GCIRNZJOL3SHR6WOSRI4KL25IPDZPQP6LDPDDCDD2F5RABTQPOK6KBOO",
    });

    assert.equal(submitted.payoutAddress.status, "pending");
    assert.equal(
      submitted.state.payoutAddresses.filter(
        (item) =>
          item.initiativeId === "initiative-reforest" &&
          item.status !== "rejected",
      ).length,
      1,
    );
    assert.equal(
      submitted.state.payoutAddresses.find(
        (item) =>
          item.initiativeId === "initiative-reforest" &&
          item.status === "pending",
      )?.address,
      submitted.payoutAddress.address,
    );
    assert.ok(
      submitted.state.auditLogs.some(
        (entry) => entry.action === "payout_address.submitted",
      ),
    );
  });

  it("lets a scoped steward replace the active payout address before admin verification", () => {
    let state = createDemoState();
    const oldAddress = state.payoutAddresses.find(
      (item) => item.initiativeId === "initiative-reforest",
    );

    assert.ok(oldAddress);
    assert.equal(oldAddress.status, "locked");

    const submitted = submitPayoutAddress(state, {
      actorProfileId: "profile-leidy",
      initiativeId: "initiative-reforest",
      address: "GCIRNZJOL3SHR6WOSRI4KL25IPDZPQP6LDPDDCDD2F5RABTQPOK6KBOO",
    });
    state = submitted.state;

    assert.equal(submitted.payoutAddress.status, "pending");
    assert.equal(
      state.payoutAddresses.find((item) => item.id === oldAddress.id)?.status,
      "rejected",
    );

    state = verifyPayoutAddress(state, {
      actorProfileId: "profile-admin",
      payoutAddressId: submitted.payoutAddress.id,
      verificationNote: "Testnet smoke receiver confirmed.",
    }).state;

    const active = state.payoutAddresses.filter(
      (item) =>
        item.initiativeId === "initiative-reforest" &&
        (item.status === "verified" || item.status === "locked"),
    );
    assert.equal(active.length, 1);
    assert.equal(active[0]?.address, submitted.payoutAddress.address);
  });

  it("keeps private milestone submissions separate from public updates", () => {
    const state = createDemoState();
    const beforeUpdateCount = state.updates.length;
    const beforeSubmissionCount = state.milestoneSubmissions.length;

    const result = submitMilestoneSubmission(state, {
      actorProfileId: "profile-leidy",
      initiativeId: "initiative-reforest",
      milestoneId: "milestone-reforest-03",
      title: "May planting evidence",
      summary: "Crew logs and supplier receipts for the May planting milestone.",
      privateDocumentPath: "milestone-submissions/submission-1/may-evidence.pdf",
    });

    assert.equal(result.submission.status, "submitted");
    assert.equal(result.submission.initiativeId, "initiative-reforest");
    assert.equal(result.submission.milestoneId, "milestone-reforest-03");
    assert.equal(result.submission.submittedByProfileId, "profile-leidy");
    assert.equal(result.state.updates.length, beforeUpdateCount);
    assert.equal(
      result.state.milestoneSubmissions.length,
      beforeSubmissionCount + 1,
    );
    assert.ok(
      result.state.auditLogs.some(
        (entry) =>
          entry.action === "milestone_submission.submitted" &&
          entry.entityId === result.submission.id,
      ),
    );
  });

  it("requires normal payments to link one approved unused milestone submission", () => {
    let state = createDemoState();
    const submitted = submitMilestoneSubmission(state, {
      actorProfileId: "profile-leidy",
      initiativeId: "initiative-reforest",
      milestoneId: "milestone-reforest-03",
      title: "May planting evidence",
      summary: "Crew logs and supplier receipts for the May planting milestone.",
    });
    state = submitted.state;

    assert.throws(
      () =>
        createFundingBatch(state, {
          actorProfileId: "profile-admin",
          initiativeId: "initiative-reforest",
          code: "PV-REFOREST-MAY26",
          periodLabel: "May 2026",
          paymentKind: "normal",
          lineItems: [
            {
              category: "Crew wages",
              amountUsdc: 1200,
              localAmount: 4_680_000,
              localCurrency: "COP",
            },
          ],
        }),
      /approved milestone submission/i,
    );

    const reviewed = reviewMilestoneSubmission(state, {
      actorProfileId: "profile-admin",
      submissionId: submitted.submission.id,
      status: "approved",
    });
    state = reviewed.state;

    assert.deepEqual(
      approvedUnusedMilestoneSubmissions(state, "initiative-reforest")
        .filter((item) => item.id === submitted.submission.id)
        .map((item) => item.id),
      [submitted.submission.id],
    );

    const batch = createFundingBatch(state, {
      actorProfileId: "profile-admin",
      initiativeId: "initiative-reforest",
      code: "PV-REFOREST-MAY26",
      periodLabel: "May 2026",
      paymentKind: "normal",
      milestoneSubmissionId: submitted.submission.id,
      lineItems: [
        {
          category: "Crew wages",
          amountUsdc: 1200,
          localAmount: 4_680_000,
          localCurrency: "COP",
        },
      ],
    });

    assert.equal(batch.batch.paymentKind, "normal");
    assert.equal(batch.batch.milestoneSubmissionId, submitted.submission.id);
    assert.ok(
      !approvedUnusedMilestoneSubmissions(batch.state, "initiative-reforest").some(
        (item) => item.id === submitted.submission.id,
      ),
    );
    assert.throws(
      () =>
        createFundingBatch(batch.state, {
          actorProfileId: "profile-admin",
          initiativeId: "initiative-reforest",
          code: "PV-REFOREST-MAY26-B",
          periodLabel: "May 2026",
          paymentKind: "normal",
          milestoneSubmissionId: submitted.submission.id,
          lineItems: [
            {
              category: "Seedlings",
              amountUsdc: 400,
              localAmount: 1_560_000,
              localCurrency: "COP",
            },
          ],
        }),
      /already linked/i,
    );
  });

  it("allows advance payments without milestone evidence", () => {
    const state = createDemoState();

    const batch = createFundingBatch(state, {
      actorProfileId: "profile-admin",
      initiativeId: "initiative-reforest",
      code: "PV-REFOREST-ADVANCE-MAY26",
      periodLabel: "May 2026 advance",
      paymentKind: "advance",
      lineItems: [
        {
          category: "Advance",
          amountUsdc: 500,
          localAmount: 1_950_000,
          localCurrency: "COP",
        },
      ],
    });

    assert.equal(batch.batch.paymentKind, "advance");
    assert.equal(batch.batch.milestoneSubmissionId, undefined);
  });
});
