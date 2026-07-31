import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildAdminViewModel } from "../src/app/admin/admin-view-model";
import { createDemoState } from "../src/lib/ayra/domain";

describe("AYRA clean-install admin console", () => {
  it("builds a usable view model without tracks, initiatives, sponsors, or payments", async () => {
    const state = createDemoState();
    const view = await buildAdminViewModel({
      ...state,
      tracks: [],
      initiatives: [],
      sponsors: [],
      applications: [],
      updates: [],
      payoutAddresses: [],
      batches: [],
      batchLineItems: [],
    });

    assert.equal(view.providencia, null);
    assert.equal(view.reforest, null);
    assert.equal(view.defaultSponsor, undefined);
    assert.equal(view.lineItemBatch, null);
    assert.equal(view.scopeLabel, "No active track · Mainnet setup");
  });
});
