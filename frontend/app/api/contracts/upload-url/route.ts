import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getBackendSession, canWriteOutsourcingContract } from "@/lib/regstack/backend-session";
import { apiFetch, BackendError } from "@/lib/regstack/backend-client";

const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
];
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/**
 * Issues a short-lived Vercel Blob client token so the browser can upload a contract file
 * directly to storage. The upload alone doesn't persist anything on the activity — the client
 * still has to call the existing PUT /activities/:id/contract with the returned file metadata
 * (see registerContractFile in outsourcing/actions.ts), same as any other pre-signed-URL flow.
 *
 * onUploadCompleted is a required callback of handleUpload but is intentionally a no-op: Vercel's
 * completion webhook hits this same route unauthenticated (it isn't the logged-in browser), and
 * every request downstream in this app expects the caller's own session, so it can't do anything
 * useful here anyway.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayloadRaw) => {
        const session = await getBackendSession();
        if (!session || !canWriteOutsourcingContract(session.role)) {
          throw new Error("Nicht berechtigt, einen Vertrag hochzuladen.");
        }

        const clientPayload = clientPayloadRaw ? (JSON.parse(clientPayloadRaw) as { activityId?: string }) : {};
        const activityId = clientPayload.activityId;
        if (!activityId) throw new Error("activityId fehlt.");

        try {
          await apiFetch(`/activities/${activityId}`);
        } catch (e) {
          if (e instanceof BackendError && e.status === 404) throw new Error("Auslagerung nicht gefunden.");
          throw e;
        }

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ activityId, userId: session.userId }),
        };
      },
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
