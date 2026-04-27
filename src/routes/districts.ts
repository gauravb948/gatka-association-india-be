import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as districtsController from "../controllers/districts.controller.js";

export const districtsRouter = Router();

districtsRouter.get(
  "/public/by-state/:stateId/registration-accepted",
  districtsController.listPublicByStateRegistrationAccepted
);
districtsRouter.post(
  "/public/by-states/registration-accepted",
  districtsController.listPublicByStatesRegistrationAccepted
);
districtsRouter.get("/public/by-state/:stateId", districtsController.listPublicByState);
districtsRouter.get(
  "/by-state/:stateId",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN"),
  districtsController.listByState
);
districtsRouter.post(
  "/state/:stateId",
  requireAuth,
  requireRoles("STATE_ADMIN", "NATIONAL_ADMIN"),
  districtsController.createForState
);
districtsRouter.get(
  "/:id",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN", "DISTRICT_ADMIN"),
  districtsController.getById
);
districtsRouter.patch(
  "/:id",
  requireAuth,
  requireRoles("STATE_ADMIN", "NATIONAL_ADMIN"),
  districtsController.patch
);
