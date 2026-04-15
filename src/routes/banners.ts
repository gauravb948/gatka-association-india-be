import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as bannersController from "../controllers/banners.controller.js";

export const bannersRouter = Router();

// Public
bannersRouter.get("/public", bannersController.listPublic);

// Admin
bannersRouter.get(
  "/admin",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  bannersController.listAdmin
);
bannersRouter.get(
  "/:id",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  bannersController.getById
);
bannersRouter.post(
  "/",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  bannersController.create
);
bannersRouter.patch(
  "/:id",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  bannersController.patch
);
bannersRouter.delete(
  "/:id",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  bannersController.remove
);

