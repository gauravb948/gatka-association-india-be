import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as migrationController from "../controllers/migration.controller.js";

export const migrationRouter = Router();

migrationRouter.post("/request", requireAuth, migrationController.requestMigration);
migrationRouter.post(
  "/admin/players",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  migrationController.adminMigratePlayers
);
migrationRouter.post(
  "/:id/approve-origin",
  requireAuth,
  migrationController.approveOrigin
);
migrationRouter.post(
  "/:id/approve-destination",
  requireAuth,
  migrationController.approveDestination
);
