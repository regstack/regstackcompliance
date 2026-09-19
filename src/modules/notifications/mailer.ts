import { env } from "../../config/env";
import { logger } from "../../utils/logger";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

// Talks to Resend's HTTP API directly (no SDK dependency) — an EU-capable provider that lets us
// pin the sending region. Without RESEND_API_KEY configured (local/dev), this logs the message
// instead of sending it, so the reminder job stays runnable without an email account.
export async function sendEmail(message: EmailMessage): Promise<void> {
  if (!env.resendApiKey) {
    logger.warn({ to: message.to, subject: message.subject }, "RESEND_API_KEY not set — reminder email logged, not sent");
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.remindersFromEmail,
      to: message.to,
      subject: message.subject,
      text: message.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Resend-Versand fehlgeschlagen (${response.status}): ${body}`);
  }
}
