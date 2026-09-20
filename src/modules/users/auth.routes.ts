import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { ForbiddenError, ValidationError } from "../../utils/errors";
import { signToken } from "../../middleware/auth";
import { rateLimit } from "../../middleware/rateLimit";
import { verifyTotpCode } from "../../utils/totp";
import { env } from "../../config/env";
import type { User } from "@prisma/client";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Keyed by IP + email so one throttled account can't be used to lock out everyone on the same
// IP, and one IP can't brute-force many accounts by rotating the email.
const loginLimiter = rateLimit({
  name: "login",
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyFn: (req) => `${req.ip}:${typeof req.body?.email === "string" ? req.body.email.toLowerCase() : ""}`,
});

const exchangeLimiter = rateLimit({ name: "exchange", windowMs: 15 * 60 * 1000, max: 30 });

const verify2faLimiter = rateLimit({
  name: "verify-2fa",
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyFn: (req) => `${req.ip}:${typeof req.body?.mfaToken === "string" ? req.body.mfaToken.slice(-16) : ""}`,
});

function sessionResponse(user: User) {
  const token = signToken({ userId: user.id, institutionId: user.institutionId, role: user.role, name: user.name });
  return { token, user: { id: user.id, name: user.name, role: user.role, institutionId: user.institutionId } };
}

// Short-lived, single-purpose token proving "password/Supabase already checked out for this
// user, only the TOTP code is outstanding" — deliberately NOT a full session token, so it can't
// reach any authenticated route via requireAuth (that only accepts tokens shaped like AuthUser,
// which this one, lacking institutionId/role, is not).
function mfaPendingToken(userId: string): string {
  return jwt.sign({ purpose: "mfa-pending", userId }, env.jwtSecret, { expiresIn: "5m" });
}

// Users with totpEnabled never get a full session straight out of /login or /exchange — both
// funnel here instead, so there is exactly one place that decides "is 2FA satisfied yet".
function requireSecondFactorOrRespond(user: User, res: import("express").Response): boolean {
  if (!user.totpEnabled) return false;
  res.json({ mfaRequired: true, mfaToken: mfaPendingToken(user.id) });
  return true;
}

router.post(
  "/login",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("E-Mail und Passwort erforderlich");

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user || !user.active) throw new ForbiddenError("Ungültige Anmeldedaten");

    const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!ok) throw new ForbiddenError("Ungültige Anmeldedaten");

    if (requireSecondFactorOrRespond(user, res)) return;
    res.json(sessionResponse(user));
  })
);

const verify2faSchema = z.object({
  mfaToken: z.string().min(1),
  code: z.string().regex(/^\d{6}$/, "6-stelliger Code erforderlich"),
});

// Completes /login or /exchange for a user with totpEnabled=true: exchanges the short-lived
// mfaToken (proof that password/Supabase auth already succeeded) plus a valid TOTP code for a
// real session — mirrors sessionResponse()'s shape exactly, so the frontend needs no extra branch
// once this step is done.
router.post(
  "/login/verify-2fa",
  verify2faLimiter,
  asyncHandler(async (req, res) => {
    const parsed = verify2faSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    let payload: jwt.JwtPayload;
    try {
      const verified = jwt.verify(parsed.data.mfaToken, env.jwtSecret);
      if (typeof verified === "string") throw new Error("unexpected string payload");
      payload = verified;
    } catch {
      throw new ForbiddenError("Ungültiges oder abgelaufenes Token — bitte erneut anmelden");
    }
    if (payload.purpose !== "mfa-pending" || typeof payload.userId !== "string") {
      throw new ForbiddenError("Ungültiges Token");
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.active || !user.totpEnabled || !user.totpSecret) {
      throw new ForbiddenError("Ungültige Anmeldedaten");
    }

    const valid = await verifyTotpCode(user.totpSecret, parsed.data.code);
    if (!valid) throw new ForbiddenError("Code ungültig oder abgelaufen");

    res.json(sessionResponse(user));
  })
);

/**
 * Exchanges an already-verified Supabase session for a backend session, without a password:
 * the frontend and backend share JWT_SECRET, so a short-lived token signed with it proves
 * "Supabase already authenticated this email" without the two systems needing matching
 * passwords. Kept separate from /login (which still authenticates by password) because it
 * trusts a different thing — a signature, not credentials — and must not accept one for the
 * other.
 */
router.post(
  "/exchange",
  exchangeLimiter,
  asyncHandler(async (req, res) => {
    const header = req.header("authorization");
    if (!header?.startsWith("Bearer ")) throw new ForbiddenError("Fehlender Authorization-Header");

    let payload: jwt.JwtPayload;
    try {
      const verified = jwt.verify(header.slice(7), env.jwtSecret);
      if (typeof verified === "string") throw new Error("unexpected string payload");
      payload = verified;
    } catch {
      throw new ForbiddenError("Ungültiges oder abgelaufenes Austausch-Token");
    }
    if (payload.purpose !== "backend-exchange" || typeof payload.email !== "string") {
      throw new ForbiddenError("Ungültiges Austausch-Token");
    }

    const user = await prisma.user.findUnique({ where: { email: payload.email } });
    if (!user || !user.active) throw new ForbiddenError("Kein verknüpftes Backend-Konto");

    if (requireSecondFactorOrRespond(user, res)) return;
    res.json(sessionResponse(user));
  })
);

export default router;
