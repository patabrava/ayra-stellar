import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  APPLICATION_FIELD_LIMITS,
  DEFAULT_APPLICATION_MILESTONES,
  applicationSchema,
  normalizeMilestonePlan,
} from "../src/lib/ayra/application-intake";

const validApplication = {
  applicantName: "AYRA Steward",
  applicantEmail: "ayra-steward@example.org",
  proposedTrackName: "Providencia",
  proposedInitiativeName: "Mangrove nursery",
  scopeSummary:
    "A public mangrove nursery with local operator ownership and monthly reporting.",
  operationalNotes:
    "Monthly updates, one contact, payout readiness, and admin-led review.",
  milestonePlan: [
    "Nursery setup",
    "Seedling germination count",
    "First public proof review",
  ],
  contactSignal: "+57 300 555 0199",
};

describe("AYRA application intake validation", () => {
  it("accepts the live application intake shape", () => {
    const parsed = applicationSchema.parse(validApplication);

    assert.equal(parsed.applicantEmail, validApplication.applicantEmail);
    assert.deepEqual(parsed.milestonePlan, validApplication.milestonePlan);
  });

  it("keeps field limits available for browser validation", () => {
    assert.deepEqual(APPLICATION_FIELD_LIMITS, {
      applicantName: 2,
      proposedTrackName: 2,
      proposedInitiativeName: 2,
      scopeSummary: 20,
      operationalNotes: 10,
      milestonePlan: 4,
      contactSignal: 5,
    });
  });

  it("rejects the short fields that previously reached the server invalid state", () => {
    const parsed = applicationSchema.safeParse({
      ...validApplication,
      scopeSummary: "short",
      operationalNotes: "short",
      milestonePlan: ["bad"],
      contactSignal: "n/a",
    });

    assert.equal(parsed.success, false);
  });

  it("normalizes multiline milestone proposals for storage", () => {
    assert.deepEqual(
      normalizeMilestonePlan(" Nursery setup \n\n Germination count \n Public proof review "),
      ["Nursery setup", "Germination count", "Public proof review"],
    );
    assert.equal(DEFAULT_APPLICATION_MILESTONES.length, 3);
  });
});
