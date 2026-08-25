import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as trainingCentersController from "../controllers/trainingCenters.controller.js";

export const trainingCentersRouter = Router();

trainingCentersRouter.get(
  "/public/by-district/:districtId",
  trainingCentersController.listPublicByDistrict
);
trainingCentersRouter.get(
  "/public/by-state/:stateId",
  trainingCentersController.listPublicByState
);
trainingCentersRouter.get(
  "/by-district/:districtId",
  requireAuth,
  requireRoles("DISTRICT_ADMIN", "STATE_ADMIN", "NATIONAL_ADMIN"),
  trainingCentersController.listByDistrict
);
trainingCentersRouter.post(
  "/district/:districtId",
  requireAuth,
  requireRoles("DISTRICT_ADMIN", "NATIONAL_ADMIN"),
  trainingCentersController.createForDistrict
);
trainingCentersRouter.patch(
  "/:id",
  requireAuth,
  requireRoles("DISTRICT_ADMIN", "STATE_ADMIN", "NATIONAL_ADMIN"),
  trainingCentersController.patch
);
trainingCentersRouter.delete(
  "/:id",
  requireAuth,
  requireRoles("DISTRICT_ADMIN", "STATE_ADMIN", "NATIONAL_ADMIN"),
  trainingCentersController.remove
);
