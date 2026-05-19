import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getApplicationSubmitStatus,
  getLoginStatus,
} from "../src/lib/ayra/status";

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

describe("AYRA login status copy", () => {
  it("maps magic-link success to a modal confirmation", () => {
    const status = getLoginStatus("link-sent");

    assert.deepEqual(status, {
      tone: "ok",
      title: "Magic link sent.",
      body:
        "Check your inbox for the sign-in email. If it does not arrive within a minute, you can resend the link from this screen.",
    });
  });

  it("keeps sign-in blockers readable in the same modal surface", () => {
    const status = getLoginStatus("scope-required");

    assert.deepEqual(status, {
      tone: "err",
      title: "Your account does not have steward access yet.",
      body:
        "The email matched, but the role records do not include steward or grantee access for this portal.",
    });
  });

  it("ignores unrelated statuses", () => {
    assert.equal(getLoginStatus("submitted"), null);
    assert.equal(getLoginStatus(undefined), null);
  });
});
