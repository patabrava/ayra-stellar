import assert from "node:assert/strict";
import test from "node:test";

import { createDemoState } from "../src/lib/ayra/domain";
import { initiativeMediaFor } from "../src/lib/ayra/public-project-media";

test("initiative media resolves one main image and an ordered gallery", () => {
  const state = createDemoState();
  const media = initiativeMediaFor(state, "initiative-reforest");

  assert.equal(media.main?.id, "media-reforest-main");
  assert.deepEqual(media.gallery.map((item) => item.id), ["media-reforest-gallery-1"]);
  assert.equal(media.main?.alt, "Community members restoring native vegetation in Providencia");
});

test("initiative media is empty when a project has no approved photography", () => {
  const media = initiativeMediaFor(createDemoState(), "initiative-reef");

  assert.equal(media.main, undefined);
  assert.deepEqual(media.gallery, []);
});
