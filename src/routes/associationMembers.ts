import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as ctrl from "../controllers/associationMembers.controller.js";

export const associationMembersRouter = Router();

associationMembersRouter.get("/public/by-state/:stateId", ctrl.listPublicByState);
associationMembersRouter.get(
  "/",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN"),
  ctrl.listAdmin
);
associationMembersRouter.post(
  "/",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN"),
  ctrl.create
);
associationMembersRouter.patch(
  "/:id",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN"),
  ctrl.patch
);
associationMembersRouter.delete(
  "/:id",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN"),
  ctrl.remove
);
