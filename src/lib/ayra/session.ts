import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  hasStewardPortalAccess,
  requireAdminRole,
  resolveRoleContext,
  type RoleContext,
} from "@/lib/ayra/auth";
import {
  hasPublicSupabaseEnv,
  operatorDemoModeEnabled,
  loadAuthenticatedAyraState,
} from "@/lib/ayra/data";
import {
  createDemoState,
  type AyraState,
  type Grantee,
  type Profile,
  type UserRole,
} from "@/lib/ayra/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SessionProfileRow = {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
};

type SessionRoleRow = {
  id: string;
  profile_id: string;
  role: string;
  initiative_id: string | null;
  grantee_id: string | null;
};

type SessionGranteeRow = {
  id: string;
  initiative_id: string;
  name: string;
  contact_profile_id?: string | null;
};

export type AyraSession = {
  supabase: SupabaseClient | null;
  state: AyraState;
  context: RoleContext;
  isDemo: boolean;
};

export function safeNextPath(value: string | undefined, fallback = "/") {
  if (!value?.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export async function getCurrentAyraSession({
  demoProfileId,
}: {
  demoProfileId?: string;
} = {}): Promise<AyraSession | null> {
  if (!hasPublicSupabaseEnv()) {
    if (!demoProfileId || !operatorDemoModeEnabled()) return null;
    return createDemoSession(demoProfileId);
  }

  const roleSession = await getLiveRoleSession();
  if (!roleSession) return null;
  const { supabase, context } = roleSession;
  const state = await loadAuthenticatedAyraState(supabase);

  return { supabase, state, context, isDemo: false };
}

export async function requireAdminSession(nextPath = "/admin") {
  if (!hasPublicSupabaseEnv()) {
    if (operatorDemoModeEnabled()) return createDemoSession("profile-admin");
    redirect(loginPath(nextPath, "supabase-not-configured"));
  }

  const roleSession = await getLiveRoleSession();
  if (!roleSession) redirect(loginPath(nextPath, "sign-in-required"));
  try {
    requireAdminRole(roleSession.context);
  } catch {
    redirect(loginPath(nextPath, "admin-required"));
  }

  return {
    ...roleSession,
    state: await loadAuthenticatedAyraState(roleSession.supabase),
    isDemo: false,
  };
}

export async function requireStewardSession(nextPath = "/steward") {
  if (!hasPublicSupabaseEnv()) {
    if (operatorDemoModeEnabled()) return createDemoSession("profile-leidy");
    redirect(loginPath(nextPath, "supabase-not-configured"));
  }

  const roleSession = await getLiveRoleSession();
  if (!roleSession) redirect(loginPath(nextPath, "sign-in-required"));
  if (!hasStewardPortalAccess(roleSession.context)) {
    redirect(loginPath(nextPath, "scope-required"));
  }

  return {
    ...roleSession,
    state: await loadAuthenticatedAyraState(roleSession.supabase),
    isDemo: false,
  };
}

export function loginPath(nextPath: string, status: string) {
  return `/login?next=${encodeURIComponent(safeNextPath(nextPath))}&status=${encodeURIComponent(status)}`;
}

export async function getCurrentRoleContext(
  supabase: SupabaseClient,
  profile: Profile,
) {
  const [roles, grantees] = await Promise.all([
    supabase
      .from("user_roles")
      .select("id,profile_id,role,initiative_id,grantee_id")
      .eq("profile_id", profile.id),
    supabase.from("grantees").select("id,initiative_id,name,contact_profile_id"),
  ]);

  if (roles.error || grantees.error) {
    throw new Error("Authenticated role scope read failed.");
  }

  return resolveRoleContext({
    profile,
    roles: ((roles.data ?? []) as SessionRoleRow[]).map(mapRole),
    grantees: ((grantees.data ?? []) as SessionGranteeRow[]).map(mapGrantee),
  });
}

async function getLiveRoleSession() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user?.email) return null;

  const profile = await claimCurrentProfile(supabase, user.email);
  const context = await getCurrentRoleContext(supabase, profile);
  return { supabase, context };
}

function createDemoSession(profileId: string): AyraSession {
  const state = createDemoState();
  const profile = state.profiles.find((item) => item.id === profileId) ?? state.profiles[0];
  if (!profile) throw new Error("Demo profile not found.");
  const context = resolveRoleContext({
    profile,
    roles: state.userRoles,
    grantees: state.grantees,
  });
  return { supabase: null, state, context, isDemo: true };
}

async function claimCurrentProfile(
  supabase: SupabaseClient,
  email: string,
): Promise<Profile> {
  const claimed = await supabase.rpc("claim_current_profile");
  if (!claimed.error && claimed.data) {
    return mapProfile(claimed.data as SessionProfileRow);
  }

  const direct = await supabase
    .from("profiles")
    .select("id,email,display_name,created_at")
    .eq("email", email)
    .maybeSingle();
  if (direct.error || !direct.data) {
    throw new Error("Unable to resolve current AYRA profile.");
  }
  return mapProfile(direct.data as SessionProfileRow);
}

function mapProfile(row: SessionProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    createdAt: row.created_at,
  };
}

function mapRole(row: SessionRoleRow): UserRole {
  return {
    id: row.id,
    profileId: row.profile_id,
    role: appRole(row.role),
    initiativeId: row.initiative_id ?? undefined,
    granteeId: row.grantee_id ?? undefined,
  };
}

function mapGrantee(row: SessionGranteeRow): Grantee {
  return {
    id: row.id,
    initiativeId: row.initiative_id,
    name: row.name,
    contactProfileId: row.contact_profile_id ?? undefined,
  };
}

function appRole(value: string): UserRole["role"] {
  if (
    value === "admin" ||
    value === "steward" ||
    value === "grantee_contact" ||
    value === "applicant"
  ) {
    return value;
  }
  return "applicant";
}
