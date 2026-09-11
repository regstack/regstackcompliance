import { Prisma, PrismaClient, AuditAction, Role } from "@prisma/client";
import { prisma } from "../db/prisma";
import { AuthUser } from "./auth";

type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

interface AuditContext {
  entityType: string;
  entityId: string;
  action: AuditAction;
  actor?: AuthUser;
  ipAddress?: string;
  before?: Record<string, unknown> | null;
}

function diffFields(
  before?: Record<string, unknown> | null,
  after?: Record<string, unknown> | null
): string[] {
  if (!before || !after) return [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changed: string[] = [];
  keys.forEach((k) => {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) changed.push(k);
  });
  return changed;
}

/**
 * Non-negotiable: every entity write goes through this helper, which performs the write and the
 * audit-log insert IN THE SAME DATABASE TRANSACTION. If the audit insert fails, the write is
 * rolled back — there is no code path that can persist a change without a matching audit row.
 * This is the server-side guarantee the prototype's UI banners point to.
 *
 * `mutate` performs the actual Prisma write and returns the resulting row; that row is used as
 * the "after" snapshot for the diff against `ctx.before` (pass the pre-write row, or omit it for
 * a CREATE where there is nothing to diff against).
 */
export async function withAudit<T extends Record<string, unknown>>(
  ctx: AuditContext,
  mutate: (tx: TxClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const after = await mutate(tx as unknown as TxClient);
    await tx.auditLogEvent.create({
      data: {
        entityType: ctx.entityType,
        entityId: ctx.entityId,
        action: ctx.action,
        actorUserId: ctx.actor?.userId,
        actorRole: ctx.actor?.role as Role | undefined,
        changedFields: diffFields(ctx.before, after) as Prisma.InputJsonValue,
        previousValues: (ctx.before ?? undefined) as Prisma.InputJsonValue | undefined,
        newValues: after as unknown as Prisma.InputJsonValue,
        ipAddress: ctx.ipAddress,
      },
    });
    return after;
  });
}
