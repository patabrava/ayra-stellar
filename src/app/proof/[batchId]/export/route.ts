import { loadStrictPublicAyraState } from "@/lib/ayra/data";
import { getProofPack } from "@/lib/ayra/domain";
import { buildPublicBatchCsv } from "@/lib/ayra/export";

type RouteContext = {
  params: Promise<{ batchId: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { batchId } = await params;
  const state = await loadStrictPublicAyraState();
  let proof;
  try {
    proof = getProofPack(state, batchId);
  } catch {
    return new Response("Batch not found.", { status: 404 });
  }

  return new Response(buildPublicBatchCsv(proof), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${proof.batchCode.toLowerCase()}-public-proof.csv"`,
    },
  });
}
