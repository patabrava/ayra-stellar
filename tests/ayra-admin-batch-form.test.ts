import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { suggestBatchCode } from "../src/lib/ayra/batch-code";

describe("AYRA admin batch form", () => {
  it("suggests a timestamped Reforestation code instead of the stale May fixture", () => {
    assert.equal(
      suggestBatchCode({
        initiativeCode: "AYRA-PVD-REFOREST",
        now: new Date("2026-06-07T07:12:34Z"),
      }),
      "PV-REFOREST-20260607T071234Z",
    );
  });

  it("uses the payout-aware batch initiative selector instead of hard-coding Reforestation", () => {
    const source = readFileSync("src/app/admin/batches/page.tsx", "utf8");

    assert.match(source, /BatchInitiativeTarget/);
    assert.match(source, /defaultInitiativeId=\{view\.reforest\.id\}/);
    assert.match(source, /targets=\{batchTargets\}/);
    assert.match(source, /defaultValue=\{suggestedBatchCode\}/);
    assert.doesNotMatch(source, /defaultValue="PV-REFOREST-MAY26"/);
    assert.doesNotMatch(
      source,
      /<input[^>]+name="initiativeId"[^>]+type="hidden"[^>]+value=\{reforest\.id\}/s,
    );
  });

  it("renders the payments composer before a non-scroll batch registry", () => {
    const source = readFileSync("src/app/admin/batches/page.tsx", "utf8");

    const composerIndex = source.indexOf(
      'data-admin-payments-section="composer"',
    );
    const registryIndex = source.indexOf(
      'data-admin-payments-section="registry"',
    );

    assert.ok(composerIndex > -1, "composer section marker should exist");
    assert.ok(registryIndex > -1, "registry section marker should exist");
    assert.ok(
      composerIndex < registryIndex,
      "composer should appear before registry in the admin payments page",
    );
    assert.doesNotMatch(
      source,
      /<div className="grid-2">\s*<div className="panel overflow-x-auto">\s*<div className="panel-head">\s*<span className="panel-title">Batch registry<\/span>/s,
    );
    assert.doesNotMatch(
      source,
      /<table className="t min-w-\[760px\]">\s*<thead>\s*<tr>\s*<th>Payment<\/th>\s*<th>Amount<\/th>\s*<th>Status<\/th>\s*<th>SDP<\/th>/s,
    );
  });

  it("sorts batch registry entries newest-first by submission time", () => {
    const source = readFileSync("src/app/admin/batches/page.tsx", "utf8");

    assert.match(
      source,
      /const registryBatches = \[\.\.\.session\.state\.batches\]\.sort\(\(a, b\) => \{/,
    );
    assert.match(
      source,
      /Date\.parse\(b\.submittedAt \?\? b\.createdAt\) -\s*Date\.parse\(a\.submittedAt \?\? a\.createdAt\)/,
    );
    assert.match(source, /return byNewest \|\| b\.code\.localeCompare\(a\.code\);/);
    assert.match(source, /\{registryBatches\.map\(\(batch\) => \{/);
  });

  it("keeps steward public updates separate from private milestone evidence", () => {
    const stewardSource = readFileSync("src/app/steward/page.tsx", "utf8");
    const actionSource = readFileSync("src/lib/ayra/actions.ts", "utf8");

    assert.match(stewardSource, /submitUpdateAction/);
    assert.match(stewardSource, /submitMilestoneSubmissionAction/);
    assert.match(stewardSource, /name="privateDocumentFile"/);
    assert.match(stewardSource, /Private milestone package/);
    assert.match(actionSource, /export async function submitMilestoneSubmissionAction/);
    assert.match(actionSource, /from\("milestone_submissions"\)/);
    assert.ok(
      stewardSource.indexOf('name="privateDocumentFile"') >
        stewardSource.indexOf("submitMilestoneSubmissionAction"),
    );
  });

  it("requires payment type and approved milestone submission controls", () => {
    const pageSource = readFileSync("src/app/admin/batches/page.tsx", "utf8");
    const selectorSource = readFileSync(
      "src/components/ayra/batch-initiative-target.tsx",
      "utf8",
    );
    const actionSource = readFileSync("src/lib/ayra/actions.ts", "utf8");
    const formSource = `${pageSource}\n${selectorSource}`;

    assert.match(formSource, /name="paymentKind"/);
    assert.match(formSource, /value="normal"/);
    assert.match(formSource, /value="advance"/);
    assert.match(formSource, /name="milestoneSubmissionId"/);
    assert.match(pageSource, /approvedMilestoneSubmissions/);
    assert.match(selectorSource, /submission\.initiativeId === target\?\.id/);
    assert.match(actionSource, /paymentKind: text\(formData, "paymentKind"\)/);
    assert.match(actionSource, /milestone_submission_id/);
    assert.match(actionSource, /milestone-required/);
  });

  it("does not block the payments page render on live SDP polling", () => {
    const pageSource = readFileSync("src/app/admin/batches/page.tsx", "utf8");

    assert.doesNotMatch(pageSource, /syncSubmittedBatches/);
    assert.doesNotMatch(pageSource, /loadAuthenticatedAyraState/);
  });

  it("shows pending labels on payment create and submit actions", () => {
    const pageSource = readFileSync("src/app/admin/batches/page.tsx", "utf8");
    const selectorSource = readFileSync(
      "src/components/ayra/batch-initiative-target.tsx",
      "utf8",
    );
    const buttonSource = readFileSync(
      "src/components/ayra/form-submit-button.tsx",
      "utf8",
    );

    assert.match(buttonSource, /useFormStatus/);
    assert.match(buttonSource, /aria-busy=\{pending\}/);
    assert.match(selectorSource, /pendingLabel="Creating ready payment\.\.\."/);
    assert.match(pageSource, /pendingLabel="Submitting payment\.\.\."/);
    assert.match(pageSource, /pendingLabel="Syncing status\.\.\."/);
  });
});
