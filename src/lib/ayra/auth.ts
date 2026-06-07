import type { Grantee, Milestone, Profile, UserRole } from "@/lib/ayra/domain";

export type RoleContext = {
  profile: Profile;
  roles: UserRole[];
  isAdmin: boolean;
  scopedInitiativeIds: string[];
  scopedGranteeIds: string[];
};

export function resolveRoleContext({
  profile,
  roles,
  grantees,
}: {
  profile: Profile;
  roles: UserRole[];
  grantees: Grantee[];
}): RoleContext {
  const ownRoles = roles.filter((role) => role.profileId === profile.id);
  const scopedInitiatives = new Set<string>();
  const scopedGrantees = new Set<string>();

  ownRoles.forEach((role) => {
    if (role.initiativeId) scopedInitiatives.add(role.initiativeId);
    if (role.granteeId) {
      scopedGrantees.add(role.granteeId);
      const grantee = grantees.find((item) => item.id === role.granteeId);
      if (grantee) scopedInitiatives.add(grantee.initiativeId);
    }
  });

  return {
    profile,
    roles: ownRoles,
    isAdmin: ownRoles.some((role) => role.role === "admin"),
    scopedInitiativeIds: [...scopedInitiatives].sort(),
    scopedGranteeIds: [...scopedGrantees].sort(),
  };
}

export function requireAdminRole(context: RoleContext) {
  if (!context.isAdmin) {
    throw new Error("Admin role required for this mutation.");
  }
}

export function hasStewardPortalAccess(context: RoleContext) {
  return context.roles.some(
    (role) => role.role === "steward" || role.role === "grantee_contact",
  );
}

export function resolveRoleHomePath(
  context: RoleContext,
  requestedNext?: string,
) {
  const canUseStewardPortal = hasStewardPortalAccess(context);
  const fallback = context.isAdmin
    ? "/admin"
    : canUseStewardPortal
      ? "/steward"
      : "/login?status=scope-required";

  if (requestedNext === "/admin") {
    return context.isAdmin ? requestedNext : fallback;
  }

  if (requestedNext?.startsWith("/admin/")) {
    return context.isAdmin ? requestedNext : fallback;
  }

  if (requestedNext === "/steward") {
    return canUseStewardPortal ? requestedNext : fallback;
  }

  if (requestedNext?.startsWith("/steward/")) {
    return canUseStewardPortal ? requestedNext : fallback;
  }

  if (requestedNext && requestedNext !== "/login") {
    return requestedNext;
  }

  return fallback;
}

export function resolveEmailOtpType(value?: string | null) {
  if (value === "recovery" || value === "invite" || value === "email_change") {
    return value;
  }

  return "email";
}

export function buildAuthCallbackUrl(origin: string, next?: string) {
  const callbackUrl = new URL("/auth/callback", normalizedOrigin(origin));
  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  callbackUrl.searchParams.set("next", safeNext);
  return callbackUrl.toString();
}

export function buildAuthCallbackRedirectPath(
  redirectPath: string,
  hasAuthError: boolean,
) {
  const redirectUrl = new URL(redirectPath, "https://ayra.local");

  if (hasAuthError) {
    redirectUrl.searchParams.set("status", "auth-error");
  } else if (!redirectUrl.searchParams.has("status")) {
    redirectUrl.searchParams.set("status", "signed-in");
  }

  return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`;
}

export function googleProviderEnabledFromSettings(settings: unknown) {
  if (!settings || typeof settings !== "object") return false;
  const external = (settings as { external?: unknown }).external;
  if (!external || typeof external !== "object") return false;
  return (external as { google?: unknown }).google === true;
}

function normalizedOrigin(origin: string) {
  return origin.endsWith("/") ? origin : `${origin}/`;
}

export function canSubmitForMilestone(
  context: RoleContext,
  milestone: Pick<Milestone, "initiativeId">,
) {
  return context.scopedInitiativeIds.includes(milestone.initiativeId);
}
