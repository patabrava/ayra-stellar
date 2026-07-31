import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  verifyProofPackRelease,
  type ProofPackReleasePayload,
} from "@/lib/ayra/proof-release";

type RouteContext = {
  params: Promise<{ batchId: string }>;
};

type ReleaseRow = {
  version: number;
  payload: ProofPackReleasePayload;
  sha256: string;
};

export async function GET(request: Request, { params }: RouteContext) {
  const { batchId } = await params;
  const requestedVersion = new URL(request.url).searchParams.get("version");
  const version = requestedVersion ? Number(requestedVersion) : null;
  if (
    requestedVersion &&
    (!Number.isSafeInteger(version) || (version ?? 0) < 1)
  ) {
    return new Response("Invalid proof release version.", { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("proof_pack_releases")
    .select("version,payload,sha256")
    .eq("batch_id", batchId);
  query = version
    ? query.eq("version", version)
    : query.order("version", { ascending: false });

  const { data, error } = await query.limit(1).maybeSingle();
  if (error) return new Response("Proof release lookup failed.", { status: 503 });
  if (!data) return new Response("Proof release not found.", { status: 404 });

  const release = data as ReleaseRow;
  if (!verifyProofPackRelease(release.payload, release.sha256)) {
    return new Response("Proof release integrity check failed.", { status: 500 });
  }

  return new Response(JSON.stringify(release.payload, null, 2), {
    headers: {
      "cache-control": "public, max-age=60, stale-while-revalidate=300",
      "content-disposition": `attachment; filename="${release.payload.batchCode.toLowerCase()}-proof-v${release.version}.json"`,
      "content-type": "application/json; charset=utf-8",
      etag: `"sha256-${release.sha256}"`,
      "x-ayra-proof-sha256": release.sha256,
    },
  });
}
