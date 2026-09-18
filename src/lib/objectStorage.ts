import crypto from "node:crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env";
import { HttpError } from "../utils/errors";

const UPLOAD_URL_EXPIRY_SECONDS = 5 * 60;
const DOWNLOAD_URL_EXPIRY_SECONDS = 5 * 60;

let client: S3Client | undefined;

// Lazy singleton — constructing S3Client at import time would make every route (and every test
// that imports contracts.routes.ts) require S3 credentials even when no upload is happening.
function getClient(): S3Client {
  if (!env.s3.bucket || !env.s3.accessKeyId || !env.s3.secretAccessKey) {
    throw new HttpError(503, "Objektspeicher ist nicht konfiguriert (S3_* Umgebungsvariablen fehlen)");
  }
  if (!client) {
    client = new S3Client({
      region: env.s3.region,
      endpoint: env.s3.endpoint,
      forcePathStyle: env.s3.forcePathStyle,
      credentials: { accessKeyId: env.s3.accessKeyId, secretAccessKey: env.s3.secretAccessKey },
    });
  }
  return client;
}

export function buildObjectKey(institutionId: string, activityId: string, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-150);
  return `contracts/${institutionId}/${activityId}/${crypto.randomUUID()}-${safeName}`;
}

export async function createUploadUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({ Bucket: env.s3.bucket, Key: key, ContentType: contentType });
  return getSignedUrl(getClient(), command, { expiresIn: UPLOAD_URL_EXPIRY_SECONDS });
}

export async function createDownloadUrl(key: string, fileName?: string | null): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: env.s3.bucket,
    Key: key,
    // encodeURIComponent also escapes quotes/CR/LF, so a hostile fileName can't break out of the
    // quoted filename or inject extra response headers here.
    ResponseContentDisposition: fileName ? `attachment; filename="${encodeURIComponent(fileName)}"` : undefined,
  });
  return getSignedUrl(getClient(), command, { expiresIn: DOWNLOAD_URL_EXPIRY_SECONDS });
}

export async function headObject(key: string): Promise<{ size: number; contentType?: string } | null> {
  try {
    const result = await getClient().send(new HeadObjectCommand({ Bucket: env.s3.bucket, Key: key }));
    return { size: result.ContentLength ?? 0, contentType: result.ContentType };
  } catch (err) {
    const status = (err as { $metadata?: { httpStatusCode?: number }; name?: string })?.$metadata?.httpStatusCode;
    const name = (err as { name?: string })?.name;
    if (status === 404 || name === "NotFound" || name === "NoSuchKey") return null;
    throw err;
  }
}

export async function deleteObject(key: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: env.s3.bucket, Key: key }));
}
