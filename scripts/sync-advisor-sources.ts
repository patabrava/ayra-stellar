import { loadEnvConfig } from "@next/env";

import { createSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";
import { loadStrictPublicAyraState } from "@/lib/ayra/data";
import { buildAdvisorSourceRows } from "@/lib/ayra/advisor";

loadEnvConfig(process.cwd());

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});

async function main() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    !hasSupabaseAdminEnv()
  ) {
    fail(
      "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are required.",
    );
  }

  const state = await loadStrictPublicAyraState();
  const rows = buildAdvisorSourceRows(state);
  const supabase = createSupabaseAdminClient();
  const upsertRows = rows.map((row) => ({
    id: row.id,
    title: row.title,
    href: row.href ?? null,
    track_slug: row.trackSlug ?? null,
    initiative_slug: row.initiativeSlug ?? null,
    content: row.content,
    content_hash: row.contentHash,
    embedding: row.embedding,
    source_kind: row.sourceKind,
    synced_at: row.syncedAt,
    updated_at: row.syncedAt,
  }));

  const { error } = await supabase.from("advisor_sources").upsert(upsertRows, {
    onConflict: "id",
  });

  if (error) {
    fail(`Advisor source sync failed: ${error.message}`);
  }

  console.log(
    JSON.stringify(
      {
        syncedRows: rows.length,
        sourceTable: "public.advisor_sources",
      },
      null,
      2,
    ),
  );
}

function fail(message: string) {
  console.error(message);
  process.exit(1);
}
