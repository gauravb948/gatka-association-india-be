import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as reportsController from "../controllers/reports.controller.js";

export const reportsRouter = Router();

reportsRouter.get(
  "/players/expiring",
  requireAuth,
  requireRoles("TRAINING_CENTER", "DISTRICT_ADMIN", "STATE_ADMIN", "NATIONAL_ADMIN"),
  reportsController.playersExpiring
);
reportsRouter.get(
  "/players/expired",
  requireAuth,
  requireRoles("TRAINING_CENTER", "DISTRICT_ADMIN", "STATE_ADMIN", "NATIONAL_ADMIN"),
  reportsController.playersExpired
);
