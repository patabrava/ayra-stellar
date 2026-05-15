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
  loadAuthenticatedAyraState,
} from "@/lib/ayra/data";
import {
  createDemoState,
  type AyraState,
  type Profile,
} from "@/lib/ayra/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SessionProfileRow = {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
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
    if (!demoProfileId) return null;
    return createDemoSession(demoProfileId);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user?.email) return null;

  const profile = await claimCurrentProfile(supabase, user.email);
  const state = await loadAuthenticatedAyraState(supabase);
  const context = resolveRoleContext({
    profile,
    roles: state.userRoles,
    grantees: state.grantees,
  });

  return { supabase, state, context, isDemo: false };
}

export async function requireAdminSession(nextPath = "/admin") {
  const session = await getCurrentAyraSession({ demoProfileId: "profile-admin" });
  if (!session) redirect(loginPath(nextPath, "sign-in-required"));

  try {
    requireAdminRole(session.context);
  } catch {
    redirect(loginPath(nextPath, "admin-required"));
  }

  return session;
}

export async function requireStewardSession(nextPath = "/steward") {
  const session = await getCurrentAyraSession({ demoProfileId: "profile-leidy" });
  if (!session) redirect(loginPath(nextPath, "sign-in-required"));
  if (!hasStewardPortalAccess(session.context)) {
    redirect(loginPath(nextPath, "scope-required"));
  }
  return session;
}

export function loginPath(nextPath: string, status: string) {
  return `/login?next=${encodeURIComponent(safeNextPath(nextPath))}&status=${encodeURIComponent(status)}`;
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
