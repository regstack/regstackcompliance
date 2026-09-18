import { Router } from "express";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

// Institution directory (id/name/role only) — used everywhere a Compliance form needs to pick a
// person (Normzuweisung target, Feststellung Verantwortlicher, ...). Mirrors the Supabase-era
// listAllPersons(): open to anyone signed in, not gated by the "user" RBAC resource (that one is
// for actual user administration), since this is just names for a dropdown.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      where: { institutionId: req.user!.institutionId, active: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    });
    res.json(users);
  })
);

export default router;
