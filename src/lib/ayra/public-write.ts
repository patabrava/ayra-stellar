export type PublicApplicationInput = {
  applicantName: string;
  applicantEmail: string;
  proposedTrackName: string;
  proposedInitiativeName: string;
  scopeSummary: string;
  operationalNotes: string;
  contactSignal: string;
};

type PublicSupabaseEnv = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
};

type FetchLike = typeof fetch;

export async function insertPublicApplication(
  env: PublicSupabaseEnv,
  input: PublicApplicationInput,
  fetchImpl: FetchLike = fetch,
) {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { ok: false, error: "Missing public Supabase env." };
  }

  const response = await fetchImpl(
    `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/applications`,
    {
      method: "POST",
      headers: {
        apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        applicant_name: input.applicantName,
        applicant_email: input.applicantEmail,
        proposed_track_name: input.proposedTrackName,
        proposed_initiative_name: input.proposedInitiativeName,
        scope_summary: input.scopeSummary,
        operational_notes: input.operationalNotes,
        contact_signal: input.contactSignal,
        status: "pending",
      }),
    },
  );

  if (!response.ok) {
    return {
      ok: false,
      error: await response.text().catch(() => `HTTP ${response.status}`),
    };
  }

  return { ok: true, error: null };
}
