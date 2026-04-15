import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as ctrl from "../controllers/messages.controller.js";

export const messagesRouter = Router();

messagesRouter.get("/public/by-state/:stateId", ctrl.listPublicByState);
messagesRouter.get(
  "/",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN"),
  ctrl.listAll
);
messagesRouter.get("/:id", requireAuth, ctrl.getById);
messagesRouter.post(
  "/",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN"),
  ctrl.create
);
messagesRouter.patch(
  "/:id",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN"),
  ctrl.patch
);
messagesRouter.delete(
  "/:id",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN"),
  ctrl.remove
);
