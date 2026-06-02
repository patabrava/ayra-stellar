import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("AYRA admin batch form", () => {
  it("uses the payout-aware batch initiative selector instead of hard-coding Reforestation", () => {
    const source = readFileSync("src/app/admin/batches/page.tsx", "utf8");

    assert.match(source, /BatchInitiativeTarget/);
    assert.match(source, /defaultInitiativeId=\{view\.reforest\.id\}/);
    assert.match(source, /targets=\{batchTargets\}/);
    assert.doesNotMatch(
      source,
      /<input[^>]+name="initiativeId"[^>]+type="hidden"[^>]+value=\{reforest\.id\}/s,
    );
  });
});
