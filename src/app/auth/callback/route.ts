import { NextResponse, type NextRequest } from "next/server";

import {
  buildAuthCallbackRedirectPath,
  resolveEmailOtpType,
  resolveRoleHomePath,
} from "@/lib/ayra/auth";
import { getCurrentRoleContext, safeNextPath } from "@/lib/ayra/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = safeNextPath(url.searchParams.get("next") ?? undefined, "/admin");
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = resolveEmailOtpType(url.searchParams.get("type"));
  const supabase = await createSupabaseServerClient();

  const result = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash
      ? await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        })
      : { error: new Error("Missing auth callback token.") };

  let redirectPath = next;

  if (!result.error) {
    const claimed = await supabase.rpc("claim_current_profile");

    if (!claimed.error && claimed.data) {
      try {
        const context = await getCurrentRoleContext(supabase, {
          id: claimed.data.id,
          email: claimed.data.email,
          displayName: claimed.data.display_name,
          createdAt: claimed.data.created_at,
        });
        redirectPath = resolveRoleHomePath(context, next);
      } catch (error) {
        console.error("Role-aware login routing fell back to the requested path.", error);
      }
    }
  }

  const redirectUrl = new URL(
    buildAuthCallbackRedirectPath(redirectPath, Boolean(result.error)),
    url.origin,
  );
  return NextResponse.redirect(redirectUrl);
}
