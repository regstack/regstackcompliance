import { cookies } from "next/headers";
import { BACKEND_TOKEN_COOKIE } from "@/lib/regstack/backend-client";

const BASE_URL = process.env.BACKEND_URL ?? "http://localhost:4000/api";

// A plain <a href> download can't attach the backend JWT itself (it lives in an httpOnly cookie
// scoped to this app, not the backend's origin) — this route runs server-side, reads that cookie,
// and proxies the backend's CSV straight through with the same headers, so the browser still gets
// a normal file download from a same-origin URL.
export async function GET() {
  const token = (await cookies()).get(BACKEND_TOKEN_COOKIE)?.value;
  if (!token) return new Response("Nicht angemeldet", { status: 401 });

  const res = await fetch(`${BASE_URL}/ict-register/arrangements/export`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return new Response(await res.text().catch(() => "Export fehlgeschlagen"), { status: res.status });

  const csv = await res.text();
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="dora-ict-register.csv"',
    },
  });
}
