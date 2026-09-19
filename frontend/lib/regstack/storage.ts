"use client";

import { createClient } from "@/lib/supabase/client";

// IKS evidence/policy files are the first file uploads in RegStack (Contract.fileObjectKey and
// Nachweis are both read/metadata-only today — see contracts.routes.ts and nachweise.routes.ts).
// Supabase Storage is the simplest fit: Supabase is already the auth provider, so no new
// credential or service needs wiring up. This uploads directly from the browser using the
// signed-in Supabase session, then the caller registers the resulting path with the Express API
// (fileObjectKey) — the file bytes never pass through the backend, same pattern as
// Contract.fileObjectKey's "pre-signed URL, out-of-band" comment.
//
// Requires a "ics-files" Supabase Storage bucket (private) with a policy allowing authenticated
// uploads/reads for the signed-in tenant's users — provisioned once in the Supabase project.
const BUCKET = "ics-files";

export async function uploadIcsFile(
  file: File,
  prefix: "ics-evidence" | "ics-policies"
): Promise<{ fileObjectKey: string; fileName: string; fileSize: number; fileMime: string }> {
  const supabase = createClient();
  const path = `${prefix}/${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined });
  if (error) throw new Error(`Upload fehlgeschlagen: ${error.message}`);
  return { fileObjectKey: path, fileName: file.name, fileSize: file.size, fileMime: file.type };
}
