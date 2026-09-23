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
// path segments or characters. The ORIGINAL name is kept separately (Nachweis.dateiname) purely
// for display, never used to build the storage key.
function safeExtension(fileName: string): string {
  const match = /\.[a-zA-Z0-9]{1,10}$/.exec(fileName);
  return match ? match[0].toLowerCase() : "";
}

export function buildNachweisKey(institutionId: string, module: string, fileName: string): string {
  return `nachweise/${institutionId}/${module}/${randomUUID()}${safeExtension(fileName)}`;
}

export async function createNachweisUploadUrl(objectKey: string, fileMime: string): Promise<string> {
  const command = new PutObjectCommand({ Bucket: requireBucket(), Key: objectKey, ContentType: fileMime });
  return getSignedUrl(s3Client(), command, { expiresIn: UPLOAD_URL_EXPIRY_SECONDS });
}

export async function createNachweisDownloadUrl(objectKey: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: requireBucket(), Key: objectKey });
  return getSignedUrl(s3Client(), command, { expiresIn: DOWNLOAD_URL_EXPIRY_SECONDS });
}

// Defense against a client posting an arbitrary/foreign fileRef to a write endpoint — same role as
// contracts/objectStorage.ts's assertObjectKeyBelongsToInstitution.
export function assertNachweisKeyBelongsToInstitution(objectKey: string, institutionId: string): void {
  if (!objectKey.startsWith(`nachweise/${institutionId}/`)) {
    throw new HttpError(403, "Objektschlüssel gehört nicht zu dieser Institution");
  }
}
