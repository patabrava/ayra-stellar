import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("AYRA admin batch form", () => {
  it("lets operators choose the batch initiative instead of hard-coding Reforestation", () => {
    const source = readFileSync("src/app/admin/page.tsx", "utf8");

    assert.match(source, /htmlFor="initiativeId"/);
    assert.match(source, /<select[^>]+id="initiativeId"[^>]+name="initiativeId"/s);
    assert.doesNotMatch(
      source,
      /<input[^>]+name="initiativeId"[^>]+type="hidden"[^>]+value=\{reforest\.id\}/s,
    );
  });
});
