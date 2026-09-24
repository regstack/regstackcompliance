import { AccountingDocumentType } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { withAudit } from "../../middleware/auditTrail";
import { AuthUser } from "../../middleware/auth";

/**
 * Shared file attachment across all four Accounting document types (Bilanz/GuV/Anhang/
 * Lagebericht) — one AccountingDocumentFile table with a documentType discriminator, mirroring
 * AccountingSignOff (signoff.ts) rather than four near-identical file columns.
 */
export async function registerAccountingFile(
  documentType: AccountingDocumentType,
  documentId: string,
  institutionId: string,
  file: { fileObjectKey: string; fileName: string; fileSize: number; fileMime: string },
  actor: AuthUser,
  ipAddress?: string
) {
  const before = await prisma.accountingDocumentFile.findUnique({
    where: { documentType_documentId: { documentType, documentId } },
  });

  return withAudit(
    {
      entityType: "AccountingDocumentFile",
      entityId: documentId,
      action: before ? "UPDATE" : "CREATE",
      actor,
      ipAddress,
      before: before as unknown as Record<string, unknown> | null,
    },
    (tx) =>
      tx.accountingDocumentFile.upsert({
        where: { documentType_documentId: { documentType, documentId } },
        create: {
          institutionId,
          documentType,
          documentId,
          ...file,
          uploadedByUserId: actor.userId,
        },
        update: {
          ...file,
          uploadedAt: new Date(),
          uploadedByUserId: actor.userId,
        },
      })
  );
}

export async function getAccountingFile(documentType: AccountingDocumentType, documentId: string) {
  return prisma.accountingDocumentFile.findUnique({
    where: { documentType_documentId: { documentType, documentId } },
  });
}

export async function listAccountingFiles(documentType: AccountingDocumentType, documentIds: string[]) {
  if (documentIds.length === 0) return [];
  return prisma.accountingDocumentFile.findMany({
    where: { documentType, documentId: { in: documentIds } },
  });
}
