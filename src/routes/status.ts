import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as statusController from "../controllers/status.controller.js";

export const statusRouter = Router();

statusRouter.patch(
  "/training-centers/:id/status",
  requireAuth,
  statusController.setTrainingCenterStatus
);
statusRouter.patch("/users/:id/status", requireAuth, statusController.setUserStatus);

