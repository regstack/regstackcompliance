import { cookies } from "next/headers";
import { BACKEND_TOKEN_COOKIE } from "@/lib/regstack/backend-client";

const BASE_URL = process.env.BACKEND_URL ?? "http://localhost:4000/api";

// Same proxy pattern as app/(app)/outsourcing/bericht/[id]/pdf/route.ts — the backend endpoint is
// shared between Jahresbericht and Quartalsbericht (RevisionReport.reportType decides the title),
// see src/modules/revisions/reports.routes.ts's GET /:id/pdf.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = (await cookies()).get(BACKEND_TOKEN_COOKIE)?.value;
  if (!token) return new Response("Nicht angemeldet", { status: 401 });

  const res = await fetch(`${BASE_URL}/revisions/reports/${id}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return new Response(await res.text().catch(() => "Export fehlgeschlagen"), { status: res.status });

  const pdf = await res.arrayBuffer();
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": res.headers.get("content-disposition") ?? `attachment; filename="jahresbericht-${id}.pdf"`,
    },
  });
}
