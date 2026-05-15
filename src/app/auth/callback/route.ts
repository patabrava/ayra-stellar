import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/ayra/session";
import { resolveEmailOtpType } from "@/lib/ayra/auth";
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

  if (!result.error) {
    await supabase.rpc("claim_current_profile");
  }

  const redirectUrl = new URL(next, url.origin);
  redirectUrl.searchParams.set("status", result.error ? "auth-error" : "signed-in");
  return NextResponse.redirect(redirectUrl);
}
