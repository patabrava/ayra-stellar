import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAuthCallbackUrl,
  buildAuthCallbackRedirectPath,
  canSubmitForMilestone,
  googleProviderEnabledFromSettings,
  requireAdminRole,
  resolveRoleContext,
  resolveEmailOtpType,
  resolveRoleHomePath,
} from "../src/lib/ayra/auth";
import type { Grantee, Milestone, Profile, UserRole } from "../src/lib/ayra/domain";

const profile: Profile = {
  id: "profile-test",
  email: "test@example.org",
  displayName: "Test Operator",
  createdAt: "2026-05-15T12:00:00.000Z",
};

describe("AYRA auth role resolution", () => {
  it("recognizes admin roles for gated operator mutations", () => {
    const context = resolveRoleContext({
      profile,
      roles: [{ id: "role-admin", profileId: profile.id, role: "admin" }],
      grantees: [],
    });

    assert.equal(context.isAdmin, true);
    assert.doesNotThrow(() => requireAdminRole(context));
  });

  it("maps grantee-contact roles into initiative submission scope", () => {
    const roles: UserRole[] = [
      {
        id: "role-contact",
        profileId: profile.id,
        role: "grantee_contact",
        granteeId: "grantee-1",
      },
    ];
    const grantees: Grantee[] = [
      {
        id: "grantee-1",
        initiativeId: "initiative-1",
        name: "Ecoparque Iron Wood",
      },
    ];
    const milestone: Milestone = {
      id: "milestone-1",
      initiativeId: "initiative-1",
      code: "M01",
      title: "Nursery ready",
      percentComplete: 100,
      status: "done",
    };
    const outsideMilestone: Milestone = {
      ...milestone,
      id: "milestone-2",
      initiativeId: "initiative-2",
    };

    const context = resolveRoleContext({ profile, roles, grantees });

    assert.deepEqual(context.scopedInitiativeIds, ["initiative-1"]);
    assert.equal(canSubmitForMilestone(context, milestone), true);
    assert.equal(canSubmitForMilestone(context, outsideMilestone), false);
  });

  it("normalizes legacy email link types to the current Supabase email verifier", () => {
    assert.equal(resolveEmailOtpType(undefined), "email");
    assert.equal(resolveEmailOtpType("magiclink"), "email");
    assert.equal(resolveEmailOtpType("signup"), "email");
    assert.equal(resolveEmailOtpType("email"), "email");
    assert.equal(resolveEmailOtpType("recovery"), "recovery");
    assert.equal(resolveEmailOtpType("invite"), "invite");
  });

  it("routes admins and stewards to the correct portal after sign-in", () => {
    const adminContext = resolveRoleContext({
      profile,
      roles: [{ id: "role-admin", profileId: profile.id, role: "admin" }],
      grantees: [],
    });
    const stewardContext = resolveRoleContext({
      profile,
      roles: [
        {
          id: "role-steward",
          profileId: profile.id,
          role: "steward",
          initiativeId: "initiative-1",
        },
      ],
      grantees: [],
    });

    assert.equal(resolveRoleHomePath(adminContext), "/admin");
    assert.equal(resolveRoleHomePath(stewardContext), "/steward");
    assert.equal(resolveRoleHomePath(stewardContext, "/admin"), "/steward");
    assert.equal(resolveRoleHomePath(adminContext, "/steward"), "/admin");
  });

  it("keeps login blocker statuses from role-aware auth callbacks", () => {
    assert.equal(
      buildAuthCallbackRedirectPath("/login?status=scope-required", false),
      "/login?status=scope-required",
    );
    assert.equal(
      buildAuthCallbackRedirectPath("/steward", false),
      "/steward?status=signed-in",
    );
    assert.equal(
      buildAuthCallbackRedirectPath("/login?status=scope-required", true),
      "/login?status=auth-error",
    );
  });

  it("builds one safe callback URL for magic links and Google OAuth", () => {
    assert.equal(
      buildAuthCallbackUrl("https://transparency.ayra.haus", "/admin"),
      "https://transparency.ayra.haus/auth/callback?next=%2Fadmin",
    );
    assert.equal(
      buildAuthCallbackUrl("https://transparency.ayra.haus/", "/steward?tab=updates"),
      "https://transparency.ayra.haus/auth/callback?next=%2Fsteward%3Ftab%3Dupdates",
    );
    assert.equal(
      buildAuthCallbackUrl("https://transparency.ayra.haus", "https://evil.test"),
      "https://transparency.ayra.haus/auth/callback?next=%2F",
    );
  });

  it("reads Google provider availability from Supabase auth settings", () => {
    assert.equal(
      googleProviderEnabledFromSettings({ external: { google: true } }),
      true,
    );
    assert.equal(
      googleProviderEnabledFromSettings({ external: { google: false } }),
      false,
    );
    assert.equal(googleProviderEnabledFromSettings({ external: null }), false);
  });
});
