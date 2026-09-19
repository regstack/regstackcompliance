import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getBackendSession } from "@/lib/regstack/backend-session";
import { apiFetch } from "@/lib/regstack/backend-client";
import type { OutsourcingActivity } from "@/lib/regstack/outsourcing";

/**
 * Streams the contract file for an activity from private Blob storage. Access control mirrors the
 * detail page itself (a valid backend session, institution scoping enforced by the Express GET
 * below) rather than the narrower contract-write role — anyone who can view the activity's
 * contract tab can also download what's attached to it.
 */
export async function GET(request: Request): Promise<NextResponse | Response> {
  const session = await getBackendSession();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  const activityId = new URL(request.url).searchParams.get("activityId");
  if (!activityId) return NextResponse.json({ error: "activityId fehlt." }, { status: 400 });

  const activity = await apiFetch<OutsourcingActivity>(`/activities/${activityId}`).catch(() => null);
  const fileObjectKey = activity?.contract?.fileObjectKey;
  if (!fileObjectKey) return NextResponse.json({ error: "Keine Datei hinterlegt." }, { status: 404 });

  const result = await get(fileObjectKey, { access: "private" }).catch(() => null);
  if (!result || result.statusCode !== 200) return NextResponse.json({ error: "Datei nicht gefunden." }, { status: 404 });

  const fileName = activity!.contract!.fileName ?? "vertrag";
  return new Response(result.stream, {
    headers: {
      "Content-Type": activity!.contract!.fileMime ?? result.blob.contentType,
      "Content-Disposition": `attachment; filename="${fileName.replace(/"/g, "")}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
