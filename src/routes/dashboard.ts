import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as dashboardStatsController from "../controllers/dashboardStats.controller.js";

export const dashboardRouter = Router();

dashboardRouter.get(
  "/stats",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN", "DISTRICT_ADMIN", "TRAINING_CENTER"),
  dashboardStatsController.getStats
);

dashboardRouter.get(
  "/overview",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN", "DISTRICT_ADMIN", "TRAINING_CENTER"),
  dashboardStatsController.getOverview
);
