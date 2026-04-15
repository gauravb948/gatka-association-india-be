import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as participationController from "../controllers/participation.controller.js";

export const participationRouter = Router();

participationRouter.post(
  "/",
  requireAuth,
  requireRoles("DISTRICT_ADMIN", "STATE_ADMIN", "NATIONAL_ADMIN"),
  participationController.create
);
