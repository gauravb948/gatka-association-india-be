import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as ctrl from "../controllers/pagesContent.controller.js";

export const pagesContentRouter = Router();

pagesContentRouter.get("/public/national", ctrl.getPublicNational);
pagesContentRouter.get("/public/by-state/:stateId", ctrl.getPublicByState);

pagesContentRouter.get(
  "/",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN"),
  ctrl.getAdmin
);
pagesContentRouter.post(
  "/",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN"),
  ctrl.upsert
);
pagesContentRouter.patch(
  "/:id",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN"),
  ctrl.patch
);
