import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as sessionsController from "../controllers/sessions.controller.js";

export const sessionsRouter = Router();

sessionsRouter.get("/", sessionsController.listActive);
sessionsRouter.get(
  "/admin",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  sessionsController.listAdmin
);
sessionsRouter.post(
  "/",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  sessionsController.create
);
sessionsRouter.patch(
  "/:id",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  sessionsController.patch
);
