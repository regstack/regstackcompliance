import { S3Client } from "@aws-sdk/client-s3";
import { env } from "../config/env";
import { HttpError } from "./errors";

let client: S3Client | null = null;

// Shared factory for every S3-compatible client this backend uses (contract uploads, DB backups,
// ...) — one place to construct it consistently against whichever provider S3_ENDPOINT points at.
export function s3Client(): S3Client {
  if (!env.s3AccessKeyId || !env.s3SecretAccessKey) {
    throw new HttpError(503, "Objektspeicher ist auf diesem Server nicht konfiguriert");
  }
  if (!client) {
    client = new S3Client({
      region: env.s3Region,
      endpoint: env.s3Endpoint,
      forcePathStyle: env.s3ForcePathStyle,
      credentials: { accessKeyId: env.s3AccessKeyId, secretAccessKey: env.s3SecretAccessKey },
    });
  }
  return client;
}
