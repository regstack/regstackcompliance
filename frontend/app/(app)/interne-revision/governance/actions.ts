"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/regstack/backend-client";

/* =====================================================================
 * Organisationsform & Unabhängigkeit (Tz. 1-2, tenant-weites Singleton)
 * ===================================================================*/

export type OrgFormInput = {
  org_form: string;
  disproportionality_reason: string | null;
  conflict_measures: string | null;
  head_of_audit_person_id: string | null;
  direct_subordination: boolean;
  independence_confirmed: boolean;
};

/** Governance-Seite schreibt nur die Organisationsform-Felder — die institutseigenen Kriterien und
 * Fristen (Tz. 6, 7, 12) leben in derselben Tabelle, werden aber ausschließlich über
 * `updateEinstellungen` auf der Einstellungen-Seite geschrieben (separate Backend-Endpoints, damit
 * keine der beiden Seiten die Felder der jeweils anderen überschreibt). */
export async function updateOrgForm(fields: OrgFormInput) {
  await apiFetch("/revisions/governance/einstellungen/org-form", {
    method: "PUT",
    body: JSON.stringify({
      orgForm: fields.org_form || undefined,
      disproportionalityReason: fields.disproportionality_reason,
      conflictMeasures: fields.conflict_measures,
      headOfAuditUserId: fields.head_of_audit_person_id,
      directSubordination: fields.direct_subordination,
      independenceConfirmed: fields.independence_confirmed,
    }),
  });
  revalidatePath("/interne-revision/governance");
  revalidatePath("/interne-revision");
}

/* =====================================================================
 * Qualitätssicherung der Revisionsfunktion (Tz. 1 S.2)
 * ===================================================================*/

export type QualitaetssicherungInput = {
  date: string;
  type: "regelmaessig" | "anlassbezogen";
  anlass: string | null;
  scope: { planung: boolean; methoden: boolean; qualitaet: boolean };
  reviewer: string | null;
  result: string | null;
  next_due: string | null;
};

export async function addQualitaetssicherung(fields: QualitaetssicherungInput) {
  await apiFetch("/revisions/governance/qs", {
    method: "POST",
    body: JSON.stringify({
      date: new Date(fields.date).toISOString(),
      type: fields.type,
      anlass: fields.anlass ?? undefined,
      scope: fields.scope,
      reviewer: fields.reviewer ?? undefined,
      result: fields.result ?? undefined,
      nextDue: fields.next_due ? new Date(fields.next_due).toISOString() : null,
    }),
  });
  revalidatePath("/interne-revision/governance");
  revalidatePath("/interne-revision");
}

/* =====================================================================
 * Begleitung wesentlicher Projekte (Tz. 1 S.3/4)
 * ===================================================================*/

export type ProjektbegleitungInput = {
  name: string; role: string; start_date: string | null; end_date: string | null;
  status: "laufend" | "abgeschlossen"; ir_contact_person_id: string | null; access_granted: boolean; notes: string | null;
};

function projektBody(fields: ProjektbegleitungInput) {
  return {
    name: fields.name,
    role: fields.role || undefined,
    startDate: fields.start_date ? new Date(fields.start_date).toISOString() : null,
    endDate: fields.end_date ? new Date(fields.end_date).toISOString() : null,
    status: fields.status,
    irContactUserId: fields.ir_contact_person_id,
    accessGranted: fields.access_granted,
    notes: fields.notes ?? undefined,
  };
}

export async function addProjektbegleitung(fields: ProjektbegleitungInput) {
  await apiFetch("/revisions/governance/projektbegleitung", { method: "POST", body: JSON.stringify(projektBody(fields)) });
  revalidatePath("/interne-revision/governance");
}

export async function updateProjektbegleitung(id: string, fields: ProjektbegleitungInput) {
  await apiFetch(`/revisions/governance/projektbegleitung/${id}`, { method: "PATCH", body: JSON.stringify(projektBody(fields)) });
  revalidatePath("/interne-revision/governance");
}

/* =====================================================================
 * Einschränkungen des Informations- und Zugriffsrechts (Tz. 1 S.3/4)
 * ===================================================================*/

export type ZugriffsvorfallInput = { date: string; area: string | null; description: string | null; escalated_to: string | null; resolved_date: string | null };

function vorfallBody(fields: ZugriffsvorfallInput) {
  return {
    date: new Date(fields.date).toISOString(),
    area: fields.area ?? undefined,
    description: fields.description ?? undefined,
    escalatedTo: fields.escalated_to ?? undefined,
    resolvedDate: fields.resolved_date ? new Date(fields.resolved_date).toISOString() : null,
  };
}

export async function addZugriffsvorfall(fields: ZugriffsvorfallInput) {
  await apiFetch("/revisions/governance/zugriffsvorfaelle", { method: "POST", body: JSON.stringify(vorfallBody(fields)) });
  revalidatePath("/interne-revision/governance");
  revalidatePath("/interne-revision");
}

export async function updateZugriffsvorfall(id: string, fields: ZugriffsvorfallInput) {
  await apiFetch(`/revisions/governance/zugriffsvorfaelle/${id}`, { method: "PATCH", body: JSON.stringify(vorfallBody(fields)) });
  revalidatePath("/interne-revision/governance");
  revalidatePath("/interne-revision");
}

/* =====================================================================
 * Der Revision mitgeteilte GL-Entscheidungen (Tz. 1 S.5) — Insert durch
 * INTERNE_REVISION ODER GESCHAEFTSLEITUNG (backend erzwingt dies serverseitig).
 * ===================================================================*/

export type GlMitteilungInput = { date: string; decision: string };

export async function addGlMitteilung(fields: GlMitteilungInput) {
  await apiFetch("/revisions/governance/gl-mitteilungen", {
    method: "POST",
    body: JSON.stringify({ date: new Date(fields.date).toISOString(), decision: fields.decision }),
  });
  revalidatePath("/interne-revision/governance");
}

/* =====================================================================
 * Von der Geschäftsleitung angeordnete Sonderprüfungen (Tz. 2 S.3,
 * Direktionsrecht) — Insert durch INTERNE_REVISION ODER GESCHAEFTSLEITUNG.
 * ===================================================================*/

export type SonderauftragInput = { date: string; ordered_by: string | null; subject: string; reason: string | null };

export async function addSonderauftrag(fields: SonderauftragInput) {
  await apiFetch("/revisions/governance/sonderauftraege", {
    method: "POST",
    body: JSON.stringify({
      date: new Date(fields.date).toISOString(),
      orderedBy: fields.ordered_by ?? undefined,
      subject: fields.subject,
      reason: fields.reason ?? undefined,
    }),
  });
  revalidatePath("/interne-revision/governance");
}
