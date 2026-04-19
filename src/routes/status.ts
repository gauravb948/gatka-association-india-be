import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as statusController from "../controllers/status.controller.js";

export const statusRouter = Router();

statusRouter.patch(
  "/training-centers/:id/status",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN", "DISTRICT_ADMIN"),
  statusController.setTrainingCenterStatus
);
statusRouter.patch("/users/:id/status", requireAuth, statusController.setUserStatus);

