import { Router } from "express";
import authRoutes from "../modules/users/auth.routes";
import institutionRoutes from "../modules/institutions/institutions.routes";
import activityRoutes from "../modules/outsourcingActivities/activities.routes";
import contractRoutes from "../modules/contracts/contracts.routes";
import handlungsoptionRoutes from "../modules/handlungsoptionen/handlungsoptionen.routes";
import monitoringRoutes from "../modules/monitoring/monitoring.routes";
import reportRoutes from "../modules/reports/reports.routes";
import auditLogRoutes from "../modules/auditLog/auditLog.routes";
import { requireAuth } from "../middleware/auth";

export const router = Router();

router.use("/auth", authRoutes);

// Everything below requires a valid JWT — requireAuth populates req.user, which every
// requirePermission() check and every withAudit() call downstream depends on.
router.use(requireAuth);
router.use("/institutions", institutionRoutes);
router.use("/activities", activityRoutes);
router.use("/activities/:activityId/contract", contractRoutes);
router.use("/activities/:activityId/handlungsoption", handlungsoptionRoutes);
router.use("/activities/:activityId/monitoring", monitoringRoutes);
router.use("/reports", reportRoutes);
router.use("/audit-log", auditLogRoutes);
