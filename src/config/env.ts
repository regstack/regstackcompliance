import "dotenv/config";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name}`);
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  // Deadline-reminder emails (src/scripts/send-deadline-reminders.ts) are optional: without a
  // Resend API key the script logs what it would have sent instead of failing the whole run, so
  // dev/local setups don't need an email account just to exercise the rest of the backend.
  resendApiKey: process.env.RESEND_API_KEY,
  remindersFromEmail: process.env.REMINDERS_FROM_EMAIL ?? "RegStack <reminders@regstack.de>",
  remindersAppUrl: process.env.REMINDERS_APP_URL ?? "https://app.regstack.de",
  // Object storage for uploaded contract documents (src/modules/contracts/objectStorage.ts) — any
  // S3-compatible provider works (AWS S3, Hetzner Object Storage, MinIO, ...): set s3Endpoint for
  // anything that isn't AWS itself, and s3ForcePathStyle for providers that don't support
  // virtual-hosted-style bucket URLs. Optional like the reminder email config: the upload/download
  // routes return a clear "not configured" error instead of the whole backend failing to boot.
  s3Endpoint: process.env.S3_ENDPOINT,
  s3Region: process.env.S3_REGION ?? "eu-central-1",
  s3Bucket: process.env.S3_BUCKET,
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID,
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  s3ForcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
};
