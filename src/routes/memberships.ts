import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as ctrl from "../controllers/memberships.controller.js";

export const membershipsRouter = Router();

membershipsRouter.get("/me", requireAuth, ctrl.listMine);

membershipsRouter.get(
  "/",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN"),
  ctrl.listAll
);
membershipsRouter.get(
  "/user/:userId",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN"),
  ctrl.listByUserId
);
membershipsRouter.get(
  "/:id",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN"),
  ctrl.getById
);
membershipsRouter.post(
  "/expire",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  ctrl.triggerExpiry
);
