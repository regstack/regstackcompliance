import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { ForbiddenError, ValidationError } from "../../utils/errors";
import { signToken } from "../../middleware/auth";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("E-Mail und Passwort erforderlich");

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user || !user.active) throw new ForbiddenError("Ungültige Anmeldedaten");

    const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!ok) throw new ForbiddenError("Ungültige Anmeldedaten");

    const token = signToken({ userId: user.id, institutionId: user.institutionId, role: user.role });
    res.json({ token, user: { id: user.id, name: user.name, role: user.role, institutionId: user.institutionId } });
  })
);

export default router;
