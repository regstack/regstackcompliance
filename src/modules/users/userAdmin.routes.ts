import { Router } from "express";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { ForbiddenError, NotFoundError, ValidationError } from "../../utils/errors";

const router = Router();

// Distinct from GET /users (users.routes.ts): that one is an open, unrestricted directory (id/name/
// role only, for picking a person in a dropdown). This is actual user administration -- gated by
// the "user" RBAC resource (rbac.ts: write: ["ADMIN"]), which existed in the permission matrix
// with no route enforcing it until now. Never touches Supabase's own auth.users -- this only
// manages the backend's own User table (email/passwordHash/role), same as every seed user.

// previousVersionId-style history isn't used here (unlike Bilanz/Nachweis/...) because User rows
// aren't "finalized documents" -- they're live records whose current state is what matters, and
// every change already gets its own permanent audit_log_events row via withAudit below.
const AUDIT_SAFE_USER_SELECT = { id: true, email: true, name: true, role: true, active: true } as const;

const ROLE_VALUES = [
  "GESCHAEFTSLEITUNG",
  "COMPLIANCE",
  "RISIKOCONTROLLING",
  "INTERNE_REVISION",
  "AUSLAGERUNGSBEAUFTRAGTER",
  "BUCHHALTUNG",
  "ADMIN",
  "VIEWER",
] as const;

router.get(
  "/",
  requirePermission("user", "read"),
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      where: { institutionId: req.user!.institutionId },
      select: { ...AUDIT_SAFE_USER_SELECT, createdAt: true, totpEnabled: true },
      orderBy: { name: "asc" },
    });
    res.json(users);
  })
);

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(ROLE_VALUES),
  password: z.string().min(12, "Passwort muss mindestens 12 Zeichen lang sein"),
});

router.post(
  "/",
  requirePermission("user", "write"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    // User.email is globally unique (schema.prisma), not per-institution -- surface that as a
    // normal validation error instead of letting a raw Prisma P2002 bubble up as a 500.
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    if (existing) throw new ValidationError("Diese E-Mail-Adresse ist bereits vergeben.");

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const id = randomUUID();
    const created = await withAudit(
      { entityType: "User", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.user.create({
          data: {
            id,
            institutionId: req.user!.institutionId,
            email: parsed.data.email.toLowerCase(),
            name: parsed.data.name,
            role: parsed.data.role,
            passwordHash,
          },
          select: AUDIT_SAFE_USER_SELECT,
        })
    );
    res.status(201).json(created);
  })
);

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(ROLE_VALUES).optional(),
  active: z.boolean().optional(),
});

router.patch(
  "/:id",
  requirePermission("user", "write"),
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.user.findFirst({
      where: { id: req.params.id, institutionId: req.user!.institutionId },
      select: AUDIT_SAFE_USER_SELECT,
    });
    if (!before) throw new NotFoundError("Nutzer nicht gefunden");

    // A locked-out Admin has no way back in short of direct DB access -- cheap to prevent outright.
    if (before.id === req.user!.userId && parsed.data.active === false) {
      throw new ForbiddenError("Sie können Ihr eigenes Konto nicht deaktivieren.");
    }

    const updated = await withAudit(
      { entityType: "User", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.user.update({ where: { id: before.id }, data: parsed.data, select: AUDIT_SAFE_USER_SELECT })
    );
    res.json(updated);
  })
);

export default router;
