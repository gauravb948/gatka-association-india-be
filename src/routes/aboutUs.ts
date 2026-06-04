import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as aboutUsController from "../controllers/aboutUs.controller.js";

export const aboutUsRouter = Router();

aboutUsRouter.get("/public/by-state/:stateId", aboutUsController.listPublicByPathState);
aboutUsRouter.get("/public", aboutUsController.listPublic);
/** Public: same as `/public/by-state/:stateId` without the `public` prefix. */
aboutUsRouter.get("/by-state/:stateId", aboutUsController.listPublicByPathState);

aboutUsRouter.get(
  "/admin",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN"),
  aboutUsController.listAdmin
);

aboutUsRouter.get(
  "/:id",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN"),
  aboutUsController.getById
);

aboutUsRouter.post(
  "/",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN"),
  aboutUsController.create
);

aboutUsRouter.patch(
  "/:id",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN"),
  aboutUsController.patch
);

aboutUsRouter.delete(
  "/:id",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN"),
  aboutUsController.remove
);
