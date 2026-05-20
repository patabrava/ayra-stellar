import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getApplicationSubmitStatus,
  getJourneyStatus,
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
        "AYRA has your application for review. An operator will review the track, initiative scope, and contact details before granting portal access. If approved, the steward portal will ask for the first Stellar payout address before any batch can be created.",
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

  it("maps invalid submissions to field-specific correction guidance", () => {
    const status = getApplicationSubmitStatus("invalid");

    assert.deepEqual(status, {
      tone: "err",
      title: "Your application could not be submitted.",
      body:
        "Some required details were missing or too short. Check the email, use at least two characters for names, twenty for scope, ten for operational details, and five for Signal or phone.",
    });
  });

  it("ignores unrelated statuses so only application outcomes open the modal", () => {
    assert.equal(getApplicationSubmitStatus("signed-in"), null);
    assert.equal(getApplicationSubmitStatus(undefined), null);
  });
});

describe("AYRA steward and admin journey status copy", () => {
  it("maps the steward payout submission to a pending-verification banner", () => {
    assert.deepEqual(getJourneyStatus("steward", "payout-submitted"), {
      tone: "warn",
      label: "Pending review",
      title: "Your first Stellar payout address is pending AYRA verification.",
      body:
        "AYRA now has the address you submitted. You can keep working on updates while the address is verified and locked for the first disbursement.",
    });
  });

  it("maps the admin approval step to the next user action", () => {
    assert.deepEqual(getJourneyStatus("admin", "application-approved"), {
      tone: "ok",
      label: "Access granted",
      title: "Application approved.",
      body:
        "The applicant now has portal access. Their next step is to submit the first Stellar payout address in the steward portal.",
    });
  });

  it("normalizes demo status prefixes before choosing copy", () => {
    assert.deepEqual(getJourneyStatus("steward", "demo-payout-submitted"), {
      tone: "warn",
      label: "Pending review",
      title: "Your first Stellar payout address is pending AYRA verification.",
      body:
        "AYRA now has the address you submitted. You can keep working on updates while the address is verified and locked for the first disbursement.",
    });
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

  it("maps Google OAuth setup failures to provider-specific guidance", () => {
    assert.deepEqual(getLoginStatus("google-provider-unavailable"), {
      tone: "err",
      title: "Google sign-in is not ready yet.",
      body:
        "The Google provider did not return a sign-in URL. Check that the Supabase Google provider has a valid Google Web client ID and secret.",
    });
  });

  it("maps missing Supabase public env to a login setup blocker", () => {
    assert.deepEqual(getLoginStatus("supabase-not-configured"), {
      tone: "err",
      title: "Supabase auth is not configured.",
      body:
        "This runtime is missing the public Supabase URL or anon key. Add the environment values, then restart the app before trying to sign in.",
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
