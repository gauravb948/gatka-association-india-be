import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as playersController from "../controllers/players.controller.js";

export const playersRouter = Router();

playersRouter.get(
  "/me/profile",
  requireAuth,
  requireRoles("PLAYER"),
  playersController.getMyProfile
);
playersRouter.post(
  "/me/renewal-payment",
  requireAuth,
  requireRoles("PLAYER"),
  playersController.renewalPayment
);
playersRouter.post(
  "/:userId/verify-documents",
  requireAuth,
  requireRoles("TRAINING_CENTER"),
  playersController.verifyDocuments
);
playersRouter.patch(
  "/:userId/tc-disable",
  requireAuth,
  requireRoles("TRAINING_CENTER"),
  playersController.tcDisable
);
playersRouter.patch(
  "/:userId/district-blacklist",
  requireAuth,
  requireRoles("DISTRICT_ADMIN"),
  playersController.districtBlacklist
);
