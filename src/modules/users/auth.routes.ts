import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { ForbiddenError, ValidationError } from "../../utils/errors";
import { signToken } from "../../middleware/auth";
import { rateLimit } from "../../middleware/rateLimit";
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
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyFn: (req) => `${req.ip}:${typeof req.body?.email === "string" ? req.body.email.toLowerCase() : ""}`,
});

const exchangeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

function sessionResponse(user: User) {
  const token = signToken({ userId: user.id, institutionId: user.institutionId, role: user.role, name: user.name });
  return { token, user: { id: user.id, name: user.name, role: user.role, institutionId: user.institutionId } };
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

    res.json(sessionResponse(user));
  })
);

export default router;
