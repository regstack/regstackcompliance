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

type EntityType = "CONTRACT" | "HANDLUNGSOPTION" | "MONITORING" | "EXTERNE_PRUEFUNG_FESTSTELLUNG";

interface Candidate {
  entityType: EntityType;
  entityId: string;
  institutionId: string;
  dueDate: Date;
  // Broadcast to every active user with one of these roles ...
  recipientRoles: Role[];
  // ... plus, when set, these specific users regardless of role — e.g. the Fachbereich person an
  // external-audit finding was actually distributed to, who may hold any role at all.
  recipientUserIds?: string[];
  subject: string;
  bodyLine: string;
  linkPath: string;
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
      institutionId: activity.institutionId,
      dueDate: activity.contractEnd!,
      recipientRoles: ["AUSLAGERUNGSBEAUFTRAGTER", "COMPLIANCE", "ADMIN"],
      subject: `Vertragslaufzeit läuft ab: ${activity.name}`,
      bodyLine:
        `Der Vertrag zu „${activity.name}“${activity.provider ? ` (Anbieter: ${activity.provider})` : ""} endet am ${formatDate(activity.contractEnd!)}.` +
        (activity.terminationNoticeMonths
          ? ` Kündigungsfrist: ${activity.terminationNoticeMonths} Monat(e) — bitte rechtzeitig über Verlängerung/Neuausschreibung entscheiden.`
          : ""),
      linkPath: `/outsourcing/${activity.id}`,
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
      institutionId: record.activity.institutionId,
      dueDate: record.reviewDate!,
      recipientRoles: ["AUSLAGERUNGSBEAUFTRAGTER", "COMPLIANCE", "ADMIN"],
      subject: `Handlungsoption zur Überprüfung fällig: ${record.activity.name}`,
      bodyLine: `Die Handlungsoption zu „${record.activity.name}“ ist zur Überprüfung fällig am ${formatDate(record.reviewDate!)}.`,
      linkPath: `/outsourcing/${record.activity.id}`,
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
      institutionId: record.activity.institutionId,
      dueDate: record.assuranceReportDueDate!,
      recipientRoles: ["AUSLAGERUNGSBEAUFTRAGTER", "COMPLIANCE", "RISIKOCONTROLLING", "ADMIN"],
      subject: `Nachweis fällig: ${record.activity.name}`,
      bodyLine: `Der Nachweis (${record.assuranceType ?? "Prüfbericht"}) zu „${record.activity.name}“ ist fällig am ${formatDate(record.assuranceReportDueDate!)}.`,
      linkPath: `/outsourcing/${record.activity.id}`,
    });
  }

  // Feststellungen aus der externen Prüfung (Wirtschaftsprüfer/Bankenaufsicht), verteilt an einen
  // Fachbereich zur Umsetzung — offen or fachbereich_erledigt still needs someone's attention;
  // geschlossen/akzeptiertes_risiko means the Frist no longer matters. Reminded twice over: the
  // specific person the finding was distributed to (any role), and Interne Revision/Admin, who
  // own escalating it further if the department doesn't act.
  const externeFeststellungen = await prisma.externePruefungFeststellung.findMany({
    where: { frist: { not: null }, status: { notIn: ["geschlossen", "akzeptiertes_risiko"] } },
    select: { id: true, institutionId: true, titel: true, frist: true, verantwortlichUserId: true },
  });
  for (const f of externeFeststellungen) {
    candidates.push({
      entityType: "EXTERNE_PRUEFUNG_FESTSTELLUNG",
      entityId: f.id,
      institutionId: f.institutionId,
      dueDate: f.frist!,
      recipientRoles: ["INTERNE_REVISION", "ADMIN"],
      recipientUserIds: f.verantwortlichUserId ? [f.verantwortlichUserId] : undefined,
      subject: `Feststellung aus externer Prüfung fällig: ${f.titel}`,
      bodyLine: `Die Feststellung „${f.titel}“ aus der externen Prüfung ist zur Umsetzung fällig am ${formatDate(f.frist!)}.`,
      linkPath: `/interne-revision/externe-pruefungen`,
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
      where: {
        institutionId: candidate.institutionId,
        active: true,
        OR: [{ role: { in: candidate.recipientRoles } }, ...(candidate.recipientUserIds?.length ? [{ id: { in: candidate.recipientUserIds } }] : [])],
      },
      select: { email: true },
    });
    if (recipients.length === 0) {
      logger.warn({ entityType: candidate.entityType, entityId: candidate.entityId }, "Fällige Erinnerung ohne passenden Empfänger übersprungen");
      continue;
    }

    const link = `${env.remindersAppUrl}${candidate.linkPath}`;
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
