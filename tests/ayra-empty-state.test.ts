import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createDemoState,
  getOptionalPublicWallProjection,
} from "../src/lib/ayra/domain";

describe("AYRA clean-install public wall", () => {
  it("returns no projection until a track has an initiative", () => {
    const state = createDemoState();

    assert.equal(
      getOptionalPublicWallProjection(
        { ...state, tracks: [], initiatives: [] },
        "providencia",
      ),
      null,
    );
    assert.equal(
      getOptionalPublicWallProjection(
        { ...state, initiatives: [] },
        "providencia",
      ),
      null,
    );
    assert.equal(
      getOptionalPublicWallProjection(state, "providencia")?.track.slug,
      "providencia",
    );
  });
});
