import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { ForbiddenError, NotFoundError, ValidationError } from "../../utils/errors";
import { generateTotpSecret, totpKeyUri, verifyTotpCode } from "../../utils/totp";
import { rateLimit } from "../../middleware/rateLimit";
import { withAudit } from "../../middleware/auditTrail";
import QRCode from "qrcode";

// previousValues/newValues on an AuditLogEvent are stored as plain JSON -- never let totpSecret
// (or any future secret field) reach that table. Every withAudit call below selects only this
// shape for both "before" and the update's own return value.
const AUDIT_SAFE_USER_SELECT = { id: true, totpEnabled: true } as const;

const router = Router();

// Self-service only (acts on req.user, never a userId from the body/params) — every route here
// changes how the CALLER's own account logs in, never another account's.
const TOTP_ELIGIBLE_ROLES = ["ADMIN", "GESCHAEFTSLEITUNG"] as const;

function requireEligibleRole(role: string): void {
  if (!TOTP_ELIGIBLE_ROLES.includes(role as (typeof TOTP_ELIGIBLE_ROLES)[number])) {
    throw new ForbiddenError("Zwei-Faktor-Authentifizierung steht dieser Rolle nicht zur Verfügung");
  }
}

const codeSchema = z.object({ code: z.string().regex(/^\d{6}$/, "6-stelliger Code erforderlich") });

// Guards brute-forcing the 6-digit code — keyed per user, not per IP, since the caller is already
// authenticated at this point.
const codeLimiter = rateLimit({ name: "2fa-code", windowMs: 15 * 60 * 1000, max: 10, keyFn: (req) => req.user!.userId });

router.get(
  "/status",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { totpEnabled: true } });
    if (!user) throw new NotFoundError("Nutzer nicht gefunden");
    res.json({ totpEnabled: user.totpEnabled, eligible: TOTP_ELIGIBLE_ROLES.includes(req.user!.role as (typeof TOTP_ELIGIBLE_ROLES)[number]) });
  })
);

// Starts (or restarts) enrollment: generates a fresh secret and stores it unconfirmed.
// totpEnabled only flips to true via POST /enable, once the caller has proven they captured the
// secret in an authenticator app — so a half-finished setup can never gate a real login.
router.post(
  "/setup",
  asyncHandler(async (req, res) => {
    requireEligibleRole(req.user!.role);

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) throw new NotFoundError("Nutzer nicht gefunden");

    const secret = generateTotpSecret();
    await withAudit(
      { entityType: "User", entityId: user.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before: { id: user.id, totpEnabled: user.totpEnabled } },
      (tx) => tx.user.update({ where: { id: user.id }, data: { totpSecret: secret, totpEnabled: false }, select: AUDIT_SAFE_USER_SELECT })
    );

    const otpauthUrl = totpKeyUri(user.email, secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    res.json({ secret, otpauthUrl, qrCodeDataUrl });
  })
);

router.post(
  "/enable",
  codeLimiter,
  asyncHandler(async (req, res) => {
    requireEligibleRole(req.user!.role);
    const parsed = codeSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user?.totpSecret) throw new ValidationError("Zuerst /2fa/setup aufrufen");

    const valid = await verifyTotpCode(user.totpSecret, parsed.data.code);
    if (!valid) throw new ValidationError("Code ungültig oder abgelaufen");

    await withAudit(
      { entityType: "User", entityId: user.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before: { id: user.id, totpEnabled: user.totpEnabled } },
      (tx) => tx.user.update({ where: { id: user.id }, data: { totpEnabled: true }, select: AUDIT_SAFE_USER_SELECT })
    );
    res.json({ totpEnabled: true });
  })
);

router.post(
  "/disable",
  codeLimiter,
  asyncHandler(async (req, res) => {
    const parsed = codeSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user?.totpEnabled || !user.totpSecret) throw new ValidationError("Zwei-Faktor-Authentifizierung ist nicht aktiv");

    const valid = await verifyTotpCode(user.totpSecret, parsed.data.code);
    if (!valid) throw new ForbiddenError("Code ungültig");

    await withAudit(
      { entityType: "User", entityId: user.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before: { id: user.id, totpEnabled: user.totpEnabled } },
      (tx) => tx.user.update({ where: { id: user.id }, data: { totpEnabled: false, totpSecret: null }, select: AUDIT_SAFE_USER_SELECT })
    );
    res.json({ totpEnabled: false });
  })
);

export default router;
