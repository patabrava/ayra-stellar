import { adminCsvFromState } from "@/lib/ayra/export";
import { requireAdminSession } from "@/lib/ayra/session";

export async function GET() {
  const session = await requireAdminSession("/admin/export");
  const csv = adminCsvFromState(session.state);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="ayra-admin-export.csv"',
    },
  });
}
