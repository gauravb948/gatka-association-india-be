import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as noticesController from "../controllers/notices.controller.js";

export const noticesRouter = Router();

// Public singleton national notice
noticesRouter.get("/national", noticesController.getNational);
noticesRouter.put(
  "/national",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  noticesController.upsertNational
);

// Hierarchy notices
noticesRouter.get("/inbox", requireAuth, noticesController.inbox);
noticesRouter.get(
  "/mine",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN", "DISTRICT_ADMIN"),
  noticesController.listMine
);
noticesRouter.post(
  "/",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN", "DISTRICT_ADMIN"),
  noticesController.create
);
noticesRouter.delete("/:id", requireAuth, noticesController.remove);
