import { randomUUID } from "crypto";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../../config/env";
import { HttpError } from "../../utils/errors";
import { s3Client } from "../../utils/s3Client";
import { AccountingDocumentType } from "@prisma/client";

// Mirrors src/modules/contracts/objectStorage.ts — same pre-signed-URL flow (bytes go straight
// from the browser to object storage, never through this API), just keyed under
// accounting/{institutionId}/{documentType}/{documentId}/ instead of contracts/.
const UPLOAD_URL_EXPIRY_SECONDS = 5 * 60;
const DOWNLOAD_URL_EXPIRY_SECONDS = 60;

function requireBucket(): string {
  if (!env.s3Bucket) throw new HttpError(503, "Objektspeicher ist auf diesem Server nicht konfiguriert");
  return env.s3Bucket;
}

function safeExtension(fileName: string): string {
  const match = /\.[a-zA-Z0-9]{1,10}$/.exec(fileName);
  return match ? match[0].toLowerCase() : "";
}

export function buildAccountingObjectKey(
  institutionId: string,
  documentType: AccountingDocumentType,
  documentId: string,
  fileName: string
): string {
  return `accounting/${institutionId}/${documentType}/${documentId}/${randomUUID()}${safeExtension(fileName)}`;
}

export async function createAccountingUploadUrl(params: {
  institutionId: string;
  documentType: AccountingDocumentType;
  documentId: string;
  fileName: string;
  fileMime: string;
}): Promise<{ uploadUrl: string; objectKey: string }> {
  const objectKey = buildAccountingObjectKey(params.institutionId, params.documentType, params.documentId, params.fileName);
  const command = new PutObjectCommand({ Bucket: requireBucket(), Key: objectKey, ContentType: params.fileMime });
  const uploadUrl = await getSignedUrl(s3Client(), command, { expiresIn: UPLOAD_URL_EXPIRY_SECONDS });
  return { uploadUrl, objectKey };
}

export async function createAccountingDownloadUrl(objectKey: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: requireBucket(), Key: objectKey });
  return getSignedUrl(s3Client(), command, { expiresIn: DOWNLOAD_URL_EXPIRY_SECONDS });
}

// Same structural defense as assertObjectKeyBelongsToInstitution in contracts/objectStorage.ts.
export function assertAccountingObjectKeyBelongsToInstitution(objectKey: string, institutionId: string): void {
  if (!objectKey.startsWith(`accounting/${institutionId}/`)) {
    throw new HttpError(403, "Objektschlüssel gehört nicht zu dieser Institution");
  }
}
