import { stewardCsvFromState } from "@/lib/ayra/export";
import { requireStewardSession } from "@/lib/ayra/session";

export async function GET() {
  const session = await requireStewardSession("/steward/export");
  const csv = stewardCsvFromState(
    session.state,
    session.context.scopedInitiativeIds,
  );
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="ayra-steward-export.csv"',
    },
  });
}
