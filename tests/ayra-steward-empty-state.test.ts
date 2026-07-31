import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("AYRA clean-install steward portal", () => {
  it("renders an assignment state without falling back to an unscoped initiative", () => {
    const source = readFileSync("src/app/steward/page.tsx", "utf8");

    assert.doesNotMatch(source, /state\.initiatives\[0\]!/);
    assert.match(source, /if \(!initiative\)/);
    assert.match(source, /Awaiting initiative assignment/);
  });
});
