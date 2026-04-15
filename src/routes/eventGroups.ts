import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as eventGroupsController from "../controllers/eventGroups.controller.js";

export const eventGroupsRouter = Router();

eventGroupsRouter.get("/", eventGroupsController.listActive);
eventGroupsRouter.get(
  "/admin",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  eventGroupsController.listAdmin
);
eventGroupsRouter.post(
  "/",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  eventGroupsController.create
);
eventGroupsRouter.patch(
  "/:id",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  eventGroupsController.patch
);
eventGroupsRouter.get("/:id/events", eventGroupsController.listEventsByGroup);
eventGroupsRouter.post(
  "/:id/events",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  eventGroupsController.createEvent
);
eventGroupsRouter.patch(
  "/events/:eventId",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  eventGroupsController.patchEvent
);
