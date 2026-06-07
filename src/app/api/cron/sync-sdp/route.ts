import { NextResponse, type NextRequest } from "next/server";

import { syncSubmittedBatches } from "@/lib/ayra/batch-sync";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.AYRA_SYNC_CRON_SECRET || process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Cron secret is not configured." }, { status: 503 });
  }

  const authorization = request.headers.get("authorization");
  if (authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const results = await syncSubmittedBatches(supabase, { limit: 20 });
  return NextResponse.json({
    checked: results.length,
    results,
  });
}
