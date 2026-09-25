import { cookies } from "next/headers";
import { BACKEND_TOKEN_COOKIE } from "@/lib/regstack/backend-client";

const BASE_URL = process.env.BACKEND_URL ?? "http://localhost:4000/api";

// A plain <a href> download can't attach the backend JWT itself (it lives in an httpOnly cookie
// scoped to this app, not the backend's origin) — this route runs server-side, reads that cookie,
// and proxies the backend's PDF straight through with the same headers, so the browser still gets
// a normal file download from a same-origin URL. Structure copied from
// app/(app)/outsourcing/ict-register/export/route.ts.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = (await cookies()).get(BACKEND_TOKEN_COOKIE)?.value;
  if (!token) return new Response("Nicht angemeldet", { status: 401 });

  const res = await fetch(`${BASE_URL}/reports/${id}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return new Response(await res.text().catch(() => "Export fehlgeschlagen"), { status: res.status });

  const pdf = await res.arrayBuffer();
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": res.headers.get("content-disposition") ?? `attachment; filename="bericht-${id}.pdf"`,
    },
  });
}
