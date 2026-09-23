"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/regstack/backend-client";
import type { NachweisModule } from "@/lib/regstack/nachweise";

/** Step 1 of the upload flow (same pattern as outsourcing/actions.ts's getContractUploadUrl): asks
 * the backend to mint a pre-signed PUT URL, so the file's bytes go straight from the browser to
 * object storage and never through this Next.js server or its apiFetch layer. Generic across every
 * module that files evidence via the Nachweis model — the caller passes which one. */
export async function getNachweisUploadUrl(module: NachweisModule, fileName: string, fileMime: string, fileSize: number) {
  return apiFetch<{ uploadUrl: string; objectKey: string }>("/nachweise/upload-url", {
    method: "POST",
    body: JSON.stringify({ module, fileName, fileMime, fileSize }),
  });
}

export type RegisterNachweisInput = {
  module: NachweisModule;
  entityType: string;
  entityId?: string;
  dateiname: string;
  objectKey: string;
  fileSize: number;
  fileMime: string;
  hash?: string;
  aufbewahrungsfrist?: string;
};

/** Step 2: once the browser's own PUT to `uploadUrl` has succeeded, registers the resulting
 * objectKey as a new Nachweis row (first version). `revalidateTargetPath` lets each call site
 * (the /compliance/nachweise overview, or a specific Arbeitspapier/Feststellung) refresh only its
 * own page — this action itself has no single "home" route. */
export async function registerNachweis(fields: RegisterNachweisInput, revalidateTargetPath: string) {
  await apiFetch("/nachweise", {
    method: "POST",
    body: JSON.stringify({
      module: fields.module,
      entityType: fields.entityType,
      entityId: fields.entityId || undefined,
      dateiname: fields.dateiname,
      fileObjectKey: fields.objectKey,
      fileSize: fields.fileSize,
      fileMime: fields.fileMime,
      hash: fields.hash || undefined,
      aufbewahrungsfrist: fields.aufbewahrungsfrist || undefined,
    }),
  });
  revalidatePath(revalidateTargetPath);
}

export type RegisterNeueVersionInput = {
  dateiname: string;
  objectKey: string;
  fileSize: number;
  fileMime: string;
  hash?: string;
  aufbewahrungsfrist?: string;
};

/** Legt eine neue Fassung zu einem bestehenden Nachweis an (previousVersionId), statt die alte zu
 * überschreiben — siehe nachweise.routes.ts's /:id/neue-version. */
export async function registerNeueVersion(nachweisId: string, fields: RegisterNeueVersionInput, revalidateTargetPath: string) {
  await apiFetch(`/nachweise/${nachweisId}/neue-version`, {
    method: "POST",
    body: JSON.stringify({
      dateiname: fields.dateiname,
      fileObjectKey: fields.objectKey,
      fileSize: fields.fileSize,
      fileMime: fields.fileMime,
      hash: fields.hash || undefined,
      aufbewahrungsfrist: fields.aufbewahrungsfrist || undefined,
    }),
  });
  revalidatePath(revalidateTargetPath);
}

export async function getNachweisDownloadUrl(nachweisId: string) {
  const { downloadUrl } = await apiFetch<{ downloadUrl: string }>(`/nachweise/${nachweisId}/download-url`);
  return downloadUrl;
}
