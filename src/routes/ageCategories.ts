import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as ageCategoriesController from "../controllers/ageCategories.controller.js";

export const ageCategoriesRouter = Router();

/** Public: no JWT (reference data for forms). */
ageCategoriesRouter.get("/", ageCategoriesController.listActive);
ageCategoriesRouter.get(
  "/admin",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  ageCategoriesController.listAdmin
);
ageCategoriesRouter.post(
  "/",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  ageCategoriesController.create
);
ageCategoriesRouter.patch(
  "/:id",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  ageCategoriesController.patch
);
ageCategoriesRouter.delete(
  "/:id",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  ageCategoriesController.remove
);
