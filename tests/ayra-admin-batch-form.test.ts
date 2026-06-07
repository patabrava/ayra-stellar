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
});
