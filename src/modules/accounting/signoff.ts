import { AccountingDocumentType } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { withAudit } from "../../middleware/auditTrail";
import { AuthUser } from "../../middleware/auth";
import { ValidationError } from "../../utils/errors";

/**
 * Shared sign-off across all four Accounting document types (Bilanz/GuV/Anhang/Lagebericht) — one
 * AccountingSignOff table with a documentType discriminator instead of four near-identical ack
 * tables, mirroring ComplianceReportAcknowledgement's per-person model.
 */
export async function acknowledgeAccountingDocument(
  documentType: AccountingDocumentType,
  doc: { id: string; status: string },
  actor: AuthUser,
  ipAddress?: string
) {
  if (doc.status !== "final") throw new ValidationError("Nur finale Dokumente können zur Kenntnis genommen werden.");

  return withAudit(
    { entityType: "AccountingSignOff", entityId: doc.id, action: "CREATE", actor, ipAddress },
    (tx) =>
      tx.accountingSignOff.upsert({
        where: { documentType_documentId_userId: { documentType, documentId: doc.id, userId: actor.userId } },
        create: { institutionId: actor.institutionId, documentType, documentId: doc.id, userId: actor.userId },
        update: {},
      })
  );
}

export async function listSignOffs(documentType: AccountingDocumentType, documentIds: string[]) {
  if (documentIds.length === 0) return [];
  return prisma.accountingSignOff.findMany({ where: { documentType, documentId: { in: documentIds } } });
}
