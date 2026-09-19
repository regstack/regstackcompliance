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

// Strips everything but the extension so the stored key never carries user-controlled path
// segments or characters — the ORIGINAL name is kept separately (Contract.fileName) purely for
// display, never used to build the storage key.
function safeExtension(fileName: string): string {
  const match = /\.[a-zA-Z0-9]{1,10}$/.exec(fileName);
  return match ? match[0].toLowerCase() : "";
}

export function buildObjectKey(institutionId: string, activityId: string, fileName: string): string {
  return `contracts/${institutionId}/${activityId}/${randomUUID()}${safeExtension(fileName)}`;
}

export async function createUploadUrl(params: {
  institutionId: string;
  activityId: string;
  fileName: string;
  fileMime: string;
}): Promise<{ uploadUrl: string; objectKey: string }> {
  const objectKey = buildObjectKey(params.institutionId, params.activityId, params.fileName);
  const command = new PutObjectCommand({ Bucket: requireBucket(), Key: objectKey, ContentType: params.fileMime });
  const uploadUrl = await getSignedUrl(s3Client(), command, { expiresIn: UPLOAD_URL_EXPIRY_SECONDS });
  return { uploadUrl, objectKey };
}

export async function createDownloadUrl(objectKey: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: requireBucket(), Key: objectKey });
  return getSignedUrl(s3Client(), command, { expiresIn: DOWNLOAD_URL_EXPIRY_SECONDS });
}
