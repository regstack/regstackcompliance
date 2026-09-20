import { randomUUID } from "crypto";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../../config/env";
import { HttpError } from "../../utils/errors";
import { s3Client } from "../../utils/s3Client";

const UPLOAD_URL_EXPIRY_SECONDS = 5 * 60;
const DOWNLOAD_URL_EXPIRY_SECONDS = 60;

function requireBucket(): string {
  if (!env.s3Bucket) throw new HttpError(503, "Objektspeicher ist auf diesem Server nicht konfiguriert");
  return env.s3Bucket;
}

// Same as contracts/objectStorage.ts's safeExtension — the stored key never carries user-controlled
// path segments or characters.
function safeExtension(fileName: string): string {
  const match = /\.[a-zA-Z0-9]{1,10}$/.exec(fileName);
  return match ? match[0].toLowerCase() : "";
}

// Replaces the previous direct-browser-to-Supabase-Storage upload (frontend/lib/regstack/storage.ts),
// whose path had no institution segment at all -- see docs/technical-debt-risk-report-2026-09-19.md,
// Critical #2. Same S3-compatible object storage the contracts module already uses, same
// institution-scoped-prefix pattern as contracts/objectStorage.ts's buildObjectKey.
export function buildIcsEvidenceKey(institutionId: string, testId: string, fileName: string): string {
  return `ics-evidence/${institutionId}/${testId}/${randomUUID()}${safeExtension(fileName)}`;
}

export function buildIcsPolicyKey(institutionId: string, fileName: string): string {
  return `ics-policies/${institutionId}/${randomUUID()}${safeExtension(fileName)}`;
}

export async function createIcsUploadUrl(objectKey: string, fileMime: string): Promise<string> {
  const command = new PutObjectCommand({ Bucket: requireBucket(), Key: objectKey, ContentType: fileMime });
  return getSignedUrl(s3Client(), command, { expiresIn: UPLOAD_URL_EXPIRY_SECONDS });
}

export async function createIcsDownloadUrl(objectKey: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: requireBucket(), Key: objectKey });
  return getSignedUrl(s3Client(), command, { expiresIn: DOWNLOAD_URL_EXPIRY_SECONDS });
}

// Defense against a client posting an arbitrary/foreign fileObjectKey to a write endpoint, same
// role as contracts/objectStorage.ts's assertObjectKeyBelongsToInstitution.
export function assertIcsKeyBelongsToInstitution(objectKey: string, institutionId: string): void {
  const ok =
    objectKey.startsWith(`ics-evidence/${institutionId}/`) || objectKey.startsWith(`ics-policies/${institutionId}/`);
  if (!ok) throw new HttpError(403, "Objektschlüssel gehört nicht zu dieser Institution");
}
