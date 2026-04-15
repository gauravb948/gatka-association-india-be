import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as ctrl from "../controllers/galleryImages.controller.js";

export const galleryImagesRouter = Router();

galleryImagesRouter.get("/public/by-state/:stateId", ctrl.listPublicByState);
galleryImagesRouter.get(
  "/",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN"),
  ctrl.listAll
);
galleryImagesRouter.post(
  "/",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN"),
  ctrl.create
);
galleryImagesRouter.delete(
  "/:id",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN"),
  ctrl.remove
);
