import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();

  await supabase.auth.signOut({ scope: "local" });
  revalidatePath("/", "layout");

  const redirectUrl = new URL("/login?status=signed-out", request.url);
  return NextResponse.redirect(redirectUrl, { status: 302 });
}
