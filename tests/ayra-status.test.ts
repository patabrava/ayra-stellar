import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getApplicationSubmitStatus } from "../src/lib/ayra/status";

describe("AYRA application submit status copy", () => {
  it("maps successful submissions to a positive confirmation", () => {
    const status = getApplicationSubmitStatus("submitted");

    assert.deepEqual(status, {
      tone: "ok",
      title: "Your application has been submitted.",
      body:
        "AYRA has your application for review. An operator will review the track, initiative scope, and contact details before granting portal access.",
    });
  });

  it("maps failures to explicit retry guidance", () => {
    const status = getApplicationSubmitStatus("error");

    assert.deepEqual(status, {
      tone: "err",
      title: "Your application could not be submitted.",
      body:
        "The submission failed before AYRA could queue it for review. Please try again in a moment.",
    });
  });

  it("ignores unrelated statuses so only application outcomes open the modal", () => {
    assert.equal(getApplicationSubmitStatus("signed-in"), null);
    assert.equal(getApplicationSubmitStatus(undefined), null);
  });
});
