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
};
