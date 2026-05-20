import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getApplicationSubmitStatus,
  getLoginStatus,
  loginStatusForAuthError,
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

  it("maps Supabase email rate limits to a delivery-specific login status", () => {
    assert.equal(
      loginStatusForAuthError({
        status: 429,
        code: "over_email_send_rate_limit",
        message: "email rate limit exceeded",
      }),
      "link-rate-limited",
    );

    assert.deepEqual(getLoginStatus("link-rate-limited"), {
      tone: "err",
      title: "Magic-link email limit reached.",
      body:
        "Supabase accepted this admin account, but the built-in mailer has temporarily blocked more emails to this address. Wait before requesting another link, or configure custom SMTP for production auth email.",
    });
  });

  it("ignores unrelated statuses", () => {
    assert.equal(getLoginStatus("submitted"), null);
    assert.equal(getLoginStatus(undefined), null);
  });
});
