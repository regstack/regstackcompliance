import { prisma } from "../../db/prisma";
import { sendEmail } from "./mailer";
import { logger } from "../../utils/logger";
import { env } from "../../config/env";
import { Role } from "@prisma/client";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Escalating reminder points, in days-until-due (0 = due today / overdue). Sorted ascending so
// "smallest applicable, not-yet-sent" below always picks the nearest milestone that was crossed.
export const REMINDER_THRESHOLDS_DAYS = [30, 14, 7, 1, 0];

export function daysUntil(date: Date, now: Date): number {
  return Math.floor((date.getTime() - now.getTime()) / MS_PER_DAY);
}

// Of the thresholds this deadline has already crossed (daysUntilDue <= threshold), pick the
// smallest one not yet sent — i.e. the most recently crossed milestone. Returns null once every
// crossed threshold has already fired, or if the deadline is still further out than the largest
// threshold. An overdue deadline (daysUntilDue < 0) crosses every threshold at once but this
// still only ever returns one per call, so a single run sends at most one email per deadline.
export function selectDueThreshold(daysUntilDue: number, alreadySent: ReadonlySet<number>): number | null {
  const applicable = REMINDER_THRESHOLDS_DAYS.filter((t) => daysUntilDue <= t).sort((a, b) => a - b);
  return applicable.find((t) => !alreadySent.has(t)) ?? null;
}

type EntityType = "CONTRACT" | "HANDLUNGSOPTION" | "MONITORING";

interface Candidate {
  entityType: EntityType;
  entityId: string;
  activityId: string;
  institutionId: string;
  dueDate: Date;
  recipientRoles: Role[];
  subject: string;
  bodyLine: string;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

async function collectCandidates(): Promise<Candidate[]> {
  const candidates: Candidate[] = [];

  const activities = await prisma.outsourcingActivity.findMany({
    where: { contractEnd: { not: null } },
    select: { id: true, institutionId: true, name: true, provider: true, contractEnd: true, terminationNoticeMonths: true },
  });
  for (const activity of activities) {
    candidates.push({
      entityType: "CONTRACT",
      entityId: activity.id,
      activityId: activity.id,
      institutionId: activity.institutionId,
      dueDate: activity.contractEnd!,
      recipientRoles: ["AUSLAGERUNGSBEAUFTRAGTER", "COMPLIANCE", "ADMIN"],
      subject: `Vertragslaufzeit läuft ab: ${activity.name}`,
      bodyLine:
        `Der Vertrag zu „${activity.name}“${activity.provider ? ` (Anbieter: ${activity.provider})` : ""} endet am ${formatDate(activity.contractEnd!)}.` +
        (activity.terminationNoticeMonths
          ? ` Kündigungsfrist: ${activity.terminationNoticeMonths} Monat(e) — bitte rechtzeitig über Verlängerung/Neuausschreibung entscheiden.`
          : ""),
    });
  }

  const handlungsoptionen = await prisma.handlungsoptionRecord.findMany({
    where: { reviewDate: { not: null } },
    include: { activity: { select: { id: true, institutionId: true, name: true } } },
  });
  for (const record of handlungsoptionen) {
    candidates.push({
      entityType: "HANDLUNGSOPTION",
      entityId: record.activity.id,
      activityId: record.activity.id,
      institutionId: record.activity.institutionId,
      dueDate: record.reviewDate!,
      recipientRoles: ["AUSLAGERUNGSBEAUFTRAGTER", "COMPLIANCE", "ADMIN"],
      subject: `Handlungsoption zur Überprüfung fällig: ${record.activity.name}`,
      bodyLine: `Die Handlungsoption zu „${record.activity.name}“ ist zur Überprüfung fällig am ${formatDate(record.reviewDate!)}.`,
    });
  }

  const monitoringRecords = await prisma.monitoringRecord.findMany({
    where: { assuranceReportDueDate: { not: null } },
    include: { activity: { select: { id: true, institutionId: true, name: true } } },
  });
  for (const record of monitoringRecords) {
    candidates.push({
      entityType: "MONITORING",
      entityId: record.id,
      activityId: record.activity.id,
      institutionId: record.activity.institutionId,
      dueDate: record.assuranceReportDueDate!,
      recipientRoles: ["AUSLAGERUNGSBEAUFTRAGTER", "COMPLIANCE", "RISIKOCONTROLLING", "ADMIN"],
      subject: `Nachweis fällig: ${record.activity.name}`,
      bodyLine: `Der Nachweis (${record.assuranceType ?? "Prüfbericht"}) zu „${record.activity.name}“ ist fällig am ${formatDate(record.assuranceReportDueDate!)}.`,
    });
  }

  return candidates;
}

export interface ReminderRunSummary {
  candidatesChecked: number;
  emailsSent: number;
}

export async function runDeadlineReminders(now: Date = new Date()): Promise<ReminderRunSummary> {
  const candidates = await collectCandidates();
  if (candidates.length === 0) return { candidatesChecked: 0, emailsSent: 0 };

  const alreadySent = await prisma.deadlineReminder.findMany({
    where: { OR: candidates.map((c) => ({ entityType: c.entityType, entityId: c.entityId })) },
  });
  const sentByEntity = new Map<string, Set<number>>();
  for (const row of alreadySent) {
    const key = `${row.entityType}:${row.entityId}`;
    if (!sentByEntity.has(key)) sentByEntity.set(key, new Set());
    sentByEntity.get(key)!.add(row.thresholdDays);
  }

  let emailsSent = 0;

  for (const candidate of candidates) {
    const key = `${candidate.entityType}:${candidate.entityId}`;
    const threshold = selectDueThreshold(daysUntil(candidate.dueDate, now), sentByEntity.get(key) ?? new Set());
    if (threshold === null) continue;

    const recipients = await prisma.user.findMany({
      where: { institutionId: candidate.institutionId, role: { in: candidate.recipientRoles }, active: true },
      select: { email: true },
    });
    if (recipients.length === 0) {
      logger.warn({ entityType: candidate.entityType, entityId: candidate.entityId }, "Fällige Erinnerung ohne passenden Empfänger übersprungen");
      continue;
    }

    const link = `${env.remindersAppUrl}/outsourcing/${candidate.activityId}`;
    const text = `${candidate.bodyLine}\n\nDetails: ${link}`;

    for (const recipient of recipients) {
      await sendEmail({ to: recipient.email, subject: candidate.subject, text });
      emailsSent += 1;
    }

    await prisma.deadlineReminder.create({
      data: { entityType: candidate.entityType, entityId: candidate.entityId, thresholdDays: threshold },
    });
  }

  return { candidatesChecked: candidates.length, emailsSent };
}
