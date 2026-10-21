import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAdvisorSources,
  mergeAdvisorSources,
  withoutStaleStoredAdvisorSources,
} from "../src/lib/ayra/advisor";
import {
  createDemoState,
  getProofPack,
  getPublicBatchFundingPurpose,
  getPublicInitiativeLeagueScore,
  getPublicInitiativeProjection,
  getPublicInitiativeSummary,
  getPublicWallProjection,
  publicFundingPurposeLabel,
  type AyraState,
  type PublicFundingPurpose,
} from "../src/lib/ayra/domain";
import { buildPublicBatchCsv } from "../src/lib/ayra/export";
import { fundingClassificationSchema } from "../src/lib/ayra/funding-classification";

const VALIDATION_BATCH = "batch-reforest-apr26";
const MAINNET_USDC_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

// Mirrors the first live rail check: one settled 5-USDC mainnet transfer with a
// real transaction hash, attached to a project that is still preparing to start.
function mainnetValidationState(purpose?: PublicFundingPurpose): AyraState {
  const state = createDemoState();
  return {
    ...state,
    initiatives: state.initiatives.map((initiative) =>
      initiative.id === "initiative-reforest" ? { ...initiative, status: "funding" as const } : initiative,
    ),
    batches: state.batches.map((batch) =>
      batch.id === VALIDATION_BATCH
        ? { ...batch, status: "settled" as const, stellarNetwork: "pubnet" as const, publicFundingPurpose: purpose }
        : batch,
    ),
    batchLineItems: state.batchLineItems.map((lineItem) =>
      lineItem.id === `${VALIDATION_BATCH}-line-1`
        ? {
            ...lineItem,
            amountUsdc: 5,
            status: "settled" as const,
            transactionHash: "9b02f2db43af6a56907b92c1e74d95db1b243524b57430a5d1a579285d6c6ac6",
            paymentAssetCode: "USDC" as const,
            paymentAssetIssuer: MAINNET_USDC_ISSUER,
            paymentAssetAmount: 5,
          }
        : lineItem,
    ),
  };
}

const reforestation = (state: AyraState) =>
  state.initiatives.find((initiative) => initiative.id === "initiative-reforest")!;

describe("AYRA funding classification", () => {
  for (const purpose of [undefined, "technical_validation"] as const) {
    it(`never presents the 5-USDC mainnet validation as project funding (${purpose ?? "unclassified"})`, () => {
      const state = mainnetValidationState(purpose);
      const initiative = reforestation(state);

      assert.deepEqual(getPublicInitiativeSummary(state, initiative), {
        stage: "Preparing to start",
        verifiedTransfersUsdc: 5,
        confirmedProjectDisbursementUsdc: 0,
        projectFundingEvidenceStatus: "unverified",
      });
      assert.equal(getPublicWallProjection(state, "providencia").spending.length, 0);
      assert.equal(getPublicInitiativeProjection(state, "providencia", "reforestation").spending.length, 0);
      assert.equal(getPublicInitiativeLeagueScore(state, initiative).components.funding, 0);

      // Technical proof stays visible, labelled as not funding.
      const proof = getProofPack(state, VALIDATION_BATCH);
      assert.equal(proof.receipts.length, 1);
      const fundingPurpose = getPublicBatchFundingPurpose(state, VALIDATION_BATCH);
      assert.match(publicFundingPurposeLabel(fundingPurpose), /not (confirmed )?project funding/i);
      const [header, row] = buildPublicBatchCsv(proof, fundingPurpose).trim().split("\n");
      assert.match(header!, /,funding_purpose$/);
      assert.match(row!, new RegExp(`,${purpose ?? "unclassified"}$`));

      const sources = buildAdvisorSources(state, {});
      const funding = sources.find((source) => source.id === "funding:providencia:reforestation")!;
      assert.match(funding.content, /Confirmed project disbursements: not yet verified/);
      assert.match(funding.content, /never means confirmed zero/);
      const proofSource = sources.find((source) => source.id === `proof:${VALIDATION_BATCH}`)!;
      assert.match(proofSource.content, /not (confirmed )?project funding/i);
      assert.doesNotMatch(sources.map((source) => source.content).join(" "), /Funded by AYRA|Funds disbursed/i);
    });
  }

  it("keeps an approved disbursement inside its own project", () => {
    const approved = mainnetValidationState("approved_project_disbursement");
    const corridor = approved.initiatives.find((item) => item.id === "initiative-amazonas-corridor")!;
    const before = mainnetValidationState();

    assert.equal(getPublicInitiativeSummary(approved, reforestation(approved)).confirmedProjectDisbursementUsdc, 5);
    assert.equal(getPublicInitiativeSummary(approved, reforestation(approved)).projectFundingEvidenceStatus, "verified");
    assert.deepEqual(
      getPublicInitiativeSummary(approved, corridor),
      getPublicInitiativeSummary(before, corridor),
    );
    assert.equal(getPublicInitiativeSummary(approved, corridor).confirmedProjectDisbursementUsdc, 0);
    assert.equal(getPublicWallProjection(approved, "amazonas").spending.length, 0);
    assert.deepEqual(
      getPublicInitiativeLeagueScore(approved, corridor),
      getPublicInitiativeLeagueScore(before, corridor),
    );
    assert.match(
      buildPublicBatchCsv(getProofPack(approved, VALIDATION_BATCH), getPublicBatchFundingPurpose(approved, VALIDATION_BATCH)),
      /,approved_project_disbursement\n?$/,
    );
  });

  it("drops stale stored copies of runtime-owned advisor facts", () => {
    const runtime = buildAdvisorSources(createDemoState(), {});
    const stored = [
      { id: "funding:providencia:retired-project", title: "Old", content: "Project is fully funded at 100000 USDC" },
      { id: "ayra:studio-pricing", title: "Old price", content: "A sponsor backs one Studio with a 37,500 EUR hard cap." },
      { id: "proof:batch-deleted", title: "Old proof", content: "Funds disbursed to the island." },
      { id: "funding:providencia:reforestation", title: "Old same id", content: "Funded by AYRA: 5 USDC disbursed" },
      { id: "extra:authorised-independent-resource", title: "Independent resource", content: "Reference-only guidance" },
    ];

    const sources = mergeAdvisorSources(runtime, withoutStaleStoredAdvisorSources(stored, runtime));
    const published = sources.map((source) => source.content).join(" ");

    assert.doesNotMatch(published, /100000 USDC|37,500 EUR hard cap|Funds disbursed to the island|Funded by AYRA/);
    assert.ok(!sources.some((source) => source.id === "funding:providencia:retired-project"));
    assert.ok(sources.some((source) => source.id === "extra:authorised-independent-resource"));
    assert.equal(sources.filter((source) => source.id === "funding:providencia:reforestation").length, 1);
  });

  it("requires source, evidence and a legal recipient before an operator can approve", () => {
    const base = {
      batchId: "50000000-0000-4000-8000-0000000000a1",
      initiativeId: "30000000-0000-4000-8000-00000000000a",
      sourceExternalId: "VIIO-PVD-2026-06-07-001",
      evidenceReference: "drive:AYRA/IMPACT/qa-validation-receipt.pdf",
    };

    assert.ok(fundingClassificationSchema.safeParse({ ...base, purpose: "technical_validation" }).success);
    assert.ok(
      fundingClassificationSchema.safeParse({
        ...base,
        purpose: "approved_project_disbursement",
        recipientGranteeId: "40000000-0000-4000-8000-00000000000a",
      }).success,
    );

    const rejected = [
      { ...base, purpose: "approved_project_disbursement" },
      { ...base, purpose: "technical_validation", evidenceReference: "  " },
      { ...base, purpose: "technical_validation", sourceExternalId: "" },
      { ...base, purpose: "funded" },
      { ...base, purpose: "technical_validation", batchId: "batch-reforest-apr26" },
      { ...base, purpose: "technical_validation", initiativeId: undefined },
    ];
    for (const input of rejected) {
      assert.equal(fundingClassificationSchema.safeParse(input).success, false, JSON.stringify(input));
    }
  });
});
